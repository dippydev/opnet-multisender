import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'process', 'events'],
      globals: { Buffer: true, process: true },
    }),
  ],
  resolve: {
    alias: {
      stream: 'stream-browserify',
    },
  },
  define: {
    global: 'globalThis',
  },
});
