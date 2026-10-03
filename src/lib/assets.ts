import type { ImageMetadata } from 'astro';
import { createAssetLookup } from './asset-lookup';

const modules = import.meta.glob<{ default: ImageMetadata }>('/src/assets/**/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
});

export const { asset, assetsIn } = createAssetLookup(modules);
