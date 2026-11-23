import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://courses.bitshield.dev',
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'never' },
});
