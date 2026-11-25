import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://agile-user-mapping-stories.courses.bitshield.dev',
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'never' },
});
