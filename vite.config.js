import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // En GitHub Pages el sitio vive en /<repositorio>/; el workflow lo pasa en BASE_PATH.
  base: process.env.BASE_PATH || '/',
  plugins: [
    VitePWA({
      // 'prompt': la nueva versión espera y la app avisa al usuario (no recarga sola con datos a medias).
      registerType: 'prompt',
      injectRegister: false, // el registro lo hace src/pwa/registro.js
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Rodales de setas',
        short_name: 'Rodales',
        description: 'Registro privado de rodales de setas, con datos cifrados en tu dispositivo.',
        lang: 'es',
        // Rutas relativas: valen tanto en / como en /<repositorio>/
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#3b6b3a',
        background_color: '#3b6b3a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Sin caché de teselas del mapa: guardarlas dejaría en el dispositivo un rastro de las zonas consultadas.
      },
    }),
  ],
});
