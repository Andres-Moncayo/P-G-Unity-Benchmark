/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  /** Where Vite forwards browser calls to `/api/*` (must match `uvicorn --port`). */
  const apiProxyTarget = (env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000').replace(/\/$/, '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'log-api-proxy-target',
        configureServer(server) {
          server.httpServer?.once('listening', () => {
            // eslint-disable-next-line no-console
            console.info(`[vite] /api proxy -> ${apiProxyTarget}`);
          });
        },
      },
    ],
    server: {
      // Allow Vite to listen on network interfaces (needed for dev tunnels)
      host: true,
      // Accept requests coming from these hostnames (tunnel + localhost)
      allowedHosts: ['localhost', '9b26lkv9-5173.use2.devtunnels.ms'],
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/tests/setup.ts',
      css: false,
    },
  };
});
