import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API + socket.io to the backend during development so the
      // frontend can call relative URLs (/api/...) without CORS friction.
      '/api': {
        target: 'http://localhost:7000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:7000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
