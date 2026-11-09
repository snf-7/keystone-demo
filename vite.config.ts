import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/',
  build: { assetsInlineLimit: process.env.VITE_INLINE ? 1e9 : 4096 },
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true, proxy: { '/api': 'http://localhost:3001' } },
});
