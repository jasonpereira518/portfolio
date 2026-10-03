// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

export default defineConfig({
  site: 'https://jasonpereira.live',
  // Astro 7 defaults to JSX-style whitespace stripping; this keeps the spaces between inline elements.
  compressHTML: true,
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Archivo',
      cssVariable: '--font-archivo',
      fallbacks: ['sans-serif'],
      options: {
        variants: [
          {
            src: ['@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2'],
            weight: '100 900',
            stretch: '62% 125%',
            style: 'normal',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Instrument Serif',
      cssVariable: '--font-instrument',
      fallbacks: ['serif'],
      options: {
        variants: [
          {
            src: ['@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2'],
            weight: 400,
            style: 'italic',
          },
        ],
      },
    },
  ],
});
