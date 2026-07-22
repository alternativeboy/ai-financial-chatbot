import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // VITE_API_URL is '/api', so in dev the browser talks to the Vite origin and
    // this forwards to Nest. Same-origin in dev means the CORS allowlist is
    // exercised only in production, where it matters.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
