import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The monorepo has one root .env rather than a per-app copy — point Vite at
  // it instead of duplicating VITE_API_URL etc. into apps/web/.env.
  envDir: '../../',
  server: {
    host: true, // bind 0.0.0.0 so the dev server is reachable from the Docker host
    port: 5173,
  },
});
