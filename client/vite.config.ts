import { fileURLToPath, URL } from 'node:url';
import basicSsl from '@vitejs/plugin-basic-ssl';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const unified = process.env.HP_UNIFIED === '1';

export default defineConfig({
  plugins: unified ? [vue()] : [vue(), basicSsl()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    ...(unified
      ? {}
      : {
          proxy: {
            '/api': {
              target: 'http://localhost:3000',
              changeOrigin: true,
            },
            '/socket.io': {
              target: 'http://localhost:3000',
              changeOrigin: true,
              ws: true,
              secure: false,
            },
          },
        }),
  },
});
