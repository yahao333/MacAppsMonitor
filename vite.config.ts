/// <reference types="vitest" />
import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/proxy/apps': {
            target: 'https://apps.apple.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/proxy\/apps/, ''),
          },
          '/proxy/itunes': {
            target: 'https://itunes.apple.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/proxy\/itunes/, ''),
          }
        }
      },
      plugins: [react()],
      test: {
        globals: true,
        environment: 'happy-dom',
        passWithNoTests: true,
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.APP_VERSION': JSON.stringify(pkg.version)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
