import { defineConfig } from 'astro/config';

// En Cloudflare Pages, el sitio se publica directamente en la raíz ('/').
// CF_PAGES_URL es la variable de entorno que Cloudflare Pages asigna automáticamente
// (por ejemplo: https://mi-proyecto.pages.dev).
const site = process.env.CF_PAGES_URL || process.env.SITE || undefined;

export default defineConfig({
  site,
  base: '/',
});