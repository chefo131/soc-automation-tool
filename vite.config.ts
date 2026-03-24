import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: "/soc-automation-generator/",
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});