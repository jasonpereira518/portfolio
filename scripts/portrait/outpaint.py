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
from PIL import Image
from rembg import new_session, remove
from scipy.ndimage import distance_transform_edt

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "scripts" / "portrait" / "cutout.png"

# Added to each side, as a share of the original width: enough for the shoulders to round off into the arms.
EXTEND = 0.27
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--extend", type=float, default=EXTEND, help="added to each side, as a share of the width")
    parser.add_argument("--out", type=Path, default=ROOT / "src" / "assets" / "portrait.png")
    args = parser.parse_args()

    cutout = Image.open(SOURCE).convert("RGBA")
    width, height = cutout.size
    pad = round(width * args.extend)
    wide = (width + pad * 2, height)

    # The original on its backdrop, centred on the wider canvas; the mask is everything new, plus the overlap.
    canvas = Image.new("RGB", wide, BACKDROP)
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
    for side, left in (("left", 0), ("right", wide[0] - crop_w)):
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
            strength=0.99,
            guidance_scale=7.0,
            num_inference_steps=40,
            generator=torch.Generator("cpu").manual_seed(args.seed + (side == "right")),
        ).images[0]
        canvas.paste(painted.resize((crop_w, crop_h), Image.LANCZOS), box[:2])
        print(f"Painted the {side} shoulder")

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
    # Above the shoulders, the new strips are backdrop: make sure nothing faint is left there.
    out_a = np.where(out_a < 0.02, 0, out_a)
    result = Image.fromarray(
        decontaminate((np.dstack([out_rgb, out_a]) * 255).round().clip(0, 255).astype(np.uint8)), "RGBA"
    )
    result.save(args.out, optimize=True)
    print(f"Wrote {args.out} ({wide[0]}×{height})")


if __name__ == "__main__":
    main()
