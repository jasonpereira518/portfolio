import { describe, expect, test } from 'vitest';
import { createAssetLookup } from '../../src/lib/asset-lookup';

const { asset, assetsIn } = createAssetLookup({
  '/src/assets/portrait.png': { default: 'portrait' },
  '/src/assets/projects/orbit.png': { default: 'orbit-cover' },
  '/src/assets/projects/orbit/02.png': { default: 'orbit-2' },
  '/src/assets/projects/orbit/01.png': { default: 'orbit-1' },
  '/src/assets/projects/orbit/deep/03.png': { default: 'orbit-3' },
});

describe('asset', () => {
  test('returns the image stored under src/assets', () => {
    expect(asset('portrait.png')).toBe('portrait');
    expect(asset('projects/orbit.png')).toBe('orbit-cover');
  });

  test('throws a message naming the missing file', () => {
    expect(() => asset('projects/missing.png')).toThrow('Missing image: src/assets/projects/missing.png');
  });
});

describe('assetsIn', () => {
  test('lists the images directly inside a folder, sorted by file name', () => {
    expect(assetsIn('projects/orbit')).toEqual(['orbit-1', 'orbit-2']);
  });

  test('returns an empty list for a folder with no images', () => {
    expect(assetsIn('projects/streetlab')).toEqual([]);
  });
});
