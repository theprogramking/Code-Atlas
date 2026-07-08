import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  define: {
    // @babel/parser, @babel/traverse, and @babel/types are written for Node
    // and directly reference these three env vars (an internal "8.0 breaking
    // changes" flag and a publish-time flag) with no guard, which crashes in
    // the browser with "process is not defined". Vite already replaces
    // process.env.NODE_ENV correctly per-mode on its own - deliberately NOT
    // touching that one here, since hardcoding it breaks React's own
    // dev/prod jsx-runtime switch (react-jsx-dev-runtime.production.js has
    // no jsxDEV export, so overriding NODE_ENV to "production" during `vite
    // dev` breaks JSX entirely).
    'process.env.BABEL_8_BREAKING': 'undefined',
    'process.env.BABEL_TYPES_8_BREAKING': 'undefined',
    'process.env.IS_PUBLISH': 'undefined',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'CodeAtlas',
        short_name: 'CodeAtlas',
        description:
          'A local-first codebase visualizer: parse JS/TS projects and explore their architecture as an interactive graph.',
        theme_color: '#0b0f19',
        background_color: '#0b0f19',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'worker',
            handler: 'CacheFirst',
            options: { cacheName: 'monaco-workers' },
          },
        ],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/reactflow')) return 'vendor-reactflow';
          if (id.includes('node_modules/monaco-editor') || id.includes('@monaco-editor/react')) return 'vendor-monaco';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
  optimizeDeps: {
    include: ['monaco-editor'],
    esbuildOptions: {
      // Same reasoning as the top-level `define` above - only the babel-
      // specific flags, never NODE_ENV, and only for this dep pre-bundling
      // pass (separate esbuild invocation from the main dev/build one).
      define: {
        'process.env.BABEL_8_BREAKING': 'undefined',
        'process.env.BABEL_TYPES_8_BREAKING': 'undefined',
        'process.env.IS_PUBLISH': 'undefined',
      },
    },
  },
});
