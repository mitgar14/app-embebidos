import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glsl'],
  // Rolldown (Vite 8) wraps CJS modules differently from esbuild.
  // React 19 still ships CJS — without this flag, the CJS interop wrapper
  // breaks React's internal dispatcher propagation, causing hooks to read
  // null from a wrapped-but-disconnected module.exports object.
  legacy: { inconsistentCjsInterop: true },
  server: {
    // Vite serves source files with "no-cache" by default, which allows the
    // browser to reuse cached responses after a 304. But the cached responses
    // contain Vite-rewritten import URLs with dep version hashes. After
    // re-optimization, those hashes change but stale 304s cause the browser
    // to load mixed dep versions (two React instances). "no-store" forces
    // fresh responses with current import URLs on every reload.
    headers: { 'Cache-Control': 'no-store' },
  },
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      'three',
      'zustand',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/postprocessing',
    ],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'zustand',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/postprocessing',
      'postprocessing',
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
