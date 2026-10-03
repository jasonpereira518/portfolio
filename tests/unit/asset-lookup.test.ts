import { describe, expect, test } from 'vitest';
import { createAssetLookup } from '../../src/lib/asset-lookup';

const { asset, assetsIn } = createAssetLookup({
  '/src/assets/portrait.png': { default: 'portrait' },
  '/src/assets/work/orbit.png': { default: 'orbit-cover' },
  '/src/assets/work/orbit/02.png': { default: 'orbit-2' },
  '/src/assets/work/orbit/01.png': { default: 'orbit-1' },
  '/src/assets/work/orbit/deep/03.png': { default: 'orbit-3' },
});

describe('asset', () => {
  test('returns the image stored under src/assets', () => {
    expect(asset('portrait.png')).toBe('portrait');
    expect(asset('work/orbit.png')).toBe('orbit-cover');
  });

  test('throws a message naming the missing file', () => {
    expect(() => asset('work/missing.png')).toThrow('Missing image: src/assets/work/missing.png');
  });
});

describe('assetsIn', () => {
  test('lists the images directly inside a folder, sorted by file name', () => {
    expect(assetsIn('work/orbit')).toEqual(['orbit-1', 'orbit-2']);
  });

  test('returns an empty list for a folder with no images', () => {
    expect(assetsIn('work/streetlab')).toEqual([]);
  });
});
