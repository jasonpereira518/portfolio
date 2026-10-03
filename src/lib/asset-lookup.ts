/** Looks images up by their path under `src/assets/`. Generic so it can be tested without real image files. */
export function createAssetLookup<T>(modules: Record<string, { default: T }>) {
  return {
    /** The image at `src/assets/<path>`. Throws when it does not exist, so a missing file fails the build. */
    asset(path: string): T {
      const found = modules[`/src/assets/${path}`];
      if (!found) throw new Error(`Missing image: src/assets/${path}`);
      return found.default;
    },

    /** Every image directly inside `src/assets/<dir>/`, sorted by file name. */
    assetsIn(dir: string): T[] {
      const prefix = `/src/assets/${dir}/`;
      return Object.keys(modules)
        .filter((key) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
        .sort()
        .map((key) => modules[key].default);
    },
  };
}
