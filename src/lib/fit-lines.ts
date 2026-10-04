/**
 * The largest font size, up to `base`, at which text is no taller than `maxHeight`. `heightAt(size)` lays the text
 * out at that size and reports its height; it must grow (or stay level) as the size grows. Text that fits at `base`
 * keeps it. Text that cannot fit even at `floor` (by default 30% of `base`) gets the floor: better small and
 * overflowing than gone. Found by bisection, to within half a pixel.
 */
export function fitFontSize(
  base: number,
  maxHeight: number,
  heightAt: (size: number) => number,
  floor = base * 0.3,
): number {
  if (heightAt(base) <= maxHeight) return base;
  if (heightAt(floor) > maxHeight) return floor;
  let fits = floor; // known to fit
  let overflows = base; // known not to
  while (overflows - fits > 0.5) {
    const middle = (fits + overflows) / 2;
    if (heightAt(middle) <= maxHeight) fits = middle;
    else overflows = middle;
  }
  return fits;
}
