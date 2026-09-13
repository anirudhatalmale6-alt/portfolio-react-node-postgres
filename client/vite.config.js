import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In dev the API runs on its own port; proxying keeps every fetch same-origin so
    // the session cookie behaves exactly as it will in production.
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
});
