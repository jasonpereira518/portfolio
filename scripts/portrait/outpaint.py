# /// script
# requires-python = ">=3.11,<3.13"
# dependencies = [
#   "torch>=2.5",
#   "diffusers>=0.32",
#   "transformers>=4.46",
#   "accelerate>=1.0",
#   "pillow>=11",
#   "numpy>=2",
#   "scipy",
#   "rembg[cpu]>=2.0.60",
# ]
# ///
"""
Widens the hero portrait so the shoulders are no longer cut off at the sides: SDXL Inpainting paints the rest of
the suit, then BiRefNet cuts the new parts out of their background. Every pixel of the original cut-out is kept,
except that the colour of its soft edge loses the white backdrop it was cut from (see decontaminate()).

    uv run scripts/portrait/outpaint.py [--seed N] [--extend SHARE] [--out src/assets/portrait.png]

Reads scripts/portrait/cutout.png (the original cut-out; never overwrite it). Runs locally on the Mac's GPU; the
first run downloads the models (about 8 GB, cached in ~/.cache/huggingface).
"""

import argparse
from pathlib import Path

import numpy as np
import torch
from diffusers import AutoencoderKL, AutoPipelineForInpainting
from PIL import Image, ImageDraw, ImageOps
from rembg import new_session, remove
from scipy.ndimage import distance_transform_edt

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "scripts" / "portrait" / "cutout.png"

# Added to each side, as a share of the original width: enough for the shoulders to round off into the arms.
EXTEND = 0.32
# How far the shoulder outline reaches past the original's side, as a share of its width: a natural shoulder is about
# three heads wide, and the original is cut off before its shoulders end.
REACH = 0.21
# How far the painted area reaches into the original, in pixels, so the seam can be blended.
OVERLAP = 12
# Each side is painted in its own crop this tall (from the bottom) and this much wider than the new strip.
CROP_HEIGHT = 0.5
CROP_INSET = 0.3
# The studio backdrop the photo was taken against, so the painted suit is lit to match.
BACKDROP = (244, 244, 244)
PROMPT = (
    "professional studio portrait photograph of a young man in a dark navy suit jacket, light blue shirt, "
    "both shoulders and upper arms fully visible, plain light grey background, soft even lighting, sharp focus"
)
NEGATIVE = "hands, text, watermark, frame, border, extra arms, deformed, blurry, cropped, out of frame"

def decontaminate(rgba: np.ndarray) -> np.ndarray:
    """
    Gives each partly transparent pixel the colour of the nearest solid one. A cut-out's soft edge keeps some of the
    backdrop it was cut from (here a light halo, brightest round the ears), which shows on the page. The
    transparency itself is left as it is.
    """
    solid = rgba[..., 3] >= 250
    _, (ny, nx) = distance_transform_edt(~solid, return_indices=True)
    out = rgba.copy()
    soft = ~solid & (rgba[..., 3] > 0)
    out[soft, :3] = rgba[ny[soft], nx[soft], :3]
    return out


def shoulder_guide(cutout: Image.Image, pad: int, wide: tuple[int, int], reach: int) -> tuple[Image.Image, tuple]:
    """
    Draws the left shoulder as a flat suit-coloured shape on the wide canvas, for the painting to refine, and returns
    it as an RGBA layer with its jacket colour. The outline carries on from the original's slope, flattens over the
    shoulder, rounds off and drops straight down the arm; SDXL alone tends to stop after a few pixels.
    """
    width, height = cutout.size
    rgba = np.asarray(cutout)
    solid = rgba[..., 3] > 200
    top = lambda c: int(np.argmax(solid[:, c]))
    y0 = np.mean([top(c) for c in range(4)])
    slope = max(0.0, (y0 - np.mean([top(c) for c in range(56, 60)])) / 57)

    # Cubic Bezier from the original's edge to the outermost point of the shoulder, which leaves going straight down.
    p0 = np.array([pad, y0])
    p3 = np.array([pad - reach, y0 + reach * (slope * 0.55 + 0.42)])
    p1 = p0 + np.array([-reach * 0.5, reach * 0.5 * slope * 0.55])
    p2 = np.array([p3[0], p3[1] - reach * 0.42])
    t = np.linspace(0, 1, 80)[:, None]
    curve = (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t**2 * p2 + t**3 * p3
    outline = [*map(tuple, curve), (p3[0], height), (pad + OVERLAP, height), (pad + OVERLAP, y0)]

    edge = rgba[int(y0) + 80 :, :30]
    colour = tuple(int(v) for v in np.median(edge[edge[..., 3] > 250][:, :3], axis=0))
    layer = Image.new("RGBA", wide, (0, 0, 0, 0))
    shape = Image.new("L", wide, 0)
    ImageDraw.Draw(shape).polygon(outline, fill=255)
    layer.paste(Image.new("RGBA", wide, colour + (255,)), (0, 0), shape)
    return layer, colour


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--strength", type=float, default=0.85, help="how far the painting may depart from the guide")
    parser.add_argument("--reach", type=float, default=REACH, help="shoulder reach past the original, share of width")
    parser.add_argument("--extend", type=float, default=EXTEND, help="added to each side, as a share of the width")
    parser.add_argument("--out", type=Path, default=ROOT / "src" / "assets" / "portrait.png")
    args = parser.parse_args()

    cutout = Image.open(SOURCE).convert("RGBA")
    width, height = cutout.size
    pad = round(width * args.extend)
    wide = (width + pad * 2, height)

    # The original on its backdrop, centred on the wider canvas; the mask is everything new, plus the overlap.
    canvas = Image.new("RGB", wide, BACKDROP)
    reach = round(width * args.reach)
    # Only the right shoulder is painted; the left is its mirror image (see below), so the two always match.
    guide, _ = shoulder_guide(ImageOps.mirror(cutout), pad, wide, reach)
    canvas.paste(ImageOps.mirror(guide), (0, 0), ImageOps.mirror(guide))
    canvas.paste(cutout, (pad, 0), cutout)
    mask = Image.new("L", wide, 255)
    mask.paste(0, (pad + OVERLAP, 0, pad + width - OVERLAP, height))

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    vae = AutoencoderKL.from_pretrained("madebyollin/sdxl-vae-fp16-fix", torch_dtype=torch.float16)
    pipe = AutoPipelineForInpainting.from_pretrained(
        "diffusers/stable-diffusion-xl-1.0-inpainting-0.1", vae=vae, torch_dtype=torch.float16, variant="fp16"
    ).to(device)

    crop_h = round(height * CROP_HEIGHT)
    crop_w = pad + round(width * CROP_INSET)
    for side, left in (("right", wide[0] - crop_w),):
        box = (left, height - crop_h, left + crop_w, height)
        # SDXL works best at about a megapixel, in multiples of 8.
        scale = (1024 * 1024 / (crop_w * crop_h)) ** 0.5
        size = (round(crop_w * scale / 8) * 8, round(crop_h * scale / 8) * 8)
        painted = pipe(
            prompt=PROMPT,
            negative_prompt=NEGATIVE,
            image=canvas.crop(box).resize(size, Image.LANCZOS),
            mask_image=mask.crop(box).resize(size, Image.NEAREST),
            width=size[0],
            height=size[1],
            strength=args.strength,
            guidance_scale=7.0,
            num_inference_steps=40,
            generator=torch.Generator("cpu").manual_seed(args.seed + (side == "right")),
        ).images[0]
        canvas.paste(painted.resize((crop_w, crop_h), Image.LANCZOS), box[:2])
        print(f"Painted the {side} shoulder")

    # Mirror it onto the left, moved up or down so its top meets the original's left edge at the same height.
    alpha_in = np.asarray(cutout)[..., 3] > 200
    seam = OVERLAP + 4
    dy = int(np.argmax(alpha_in[:, seam])) - int(np.argmax(alpha_in[:, width - 1 - seam]))
    strip = ImageOps.mirror(canvas).crop((0, 0, pad + OVERLAP, height))
    rows = np.clip(np.arange(height) - dy, 0, height - 1)  # the edge rows repeat rather than wrapping round
    canvas.paste(Image.fromarray(np.asarray(strip)[rows]), (0, 0))

    # Cut the painted parts out of their backdrop.
    session = new_session("birefnet-portrait")
    alpha = np.asarray(remove(canvas, session=session, only_mask=True), dtype=np.float32) / 255

    # Keep the original exactly, blending into the painting only across the overlap at its sides.
    keep = np.zeros((height, wide[0]), dtype=np.float32)
    ramp = np.clip((np.arange(width) - OVERLAP / 2) / OVERLAP, 0, 1)
    keep[:, pad : pad + width] = np.minimum(ramp, ramp[::-1])[None, :]
    original = Image.new("RGBA", wide, (0, 0, 0, 0))
    original.paste(cutout, (pad, 0))
    orig = np.asarray(original, dtype=np.float32) / 255
    rgb = np.asarray(canvas, dtype=np.float32) / 255
    out_rgb = rgb * (1 - keep[..., None]) + orig[..., :3] * keep[..., None]
    out_a = alpha * (1 - keep) + orig[..., 3] * keep
    # The cut-out frays along the bottom edge, where the suit runs out of the frame: repeat the last good row there.
    new = np.ones(wide[0], dtype=bool)
    new[pad + OVERLAP : pad + width - OVERLAP] = False
    out_rgb[-12:, new] = out_rgb[-13, new]
    out_a[-12:, new] = out_a[-13, new]
    # Above the shoulders, the new strips are backdrop: make sure nothing faint is left there.
    out_a = np.where(out_a < 0.02, 0, out_a)
    result = Image.fromarray(
        decontaminate((np.dstack([out_rgb, out_a]) * 255).round().clip(0, 255).astype(np.uint8)), "RGBA"
    )
    result.save(args.out, optimize=True)
    print(f"Wrote {args.out} ({wide[0]}×{height})")


if __name__ == "__main__":
    main()
