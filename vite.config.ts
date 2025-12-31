import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env from parent directory since .env.local is in root
  const env = loadEnv(mode, '..', '');
  return {
    root: 'frontend',  // Set frontend as root directory
    envDir: '..',  // Look for .env files in parent directory
    server: {
      port: 5173,  // Standard Vite port
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './frontend/src'),
      }
    },
    build: {
      outDir: '../dist',  // Output to root dist directory
      emptyOutDir: true,
    }
  };
});
