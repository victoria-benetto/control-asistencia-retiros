import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    pool: 'threads',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.spec.tsx', 'src/__tests__/**/*.spec.ts'],
  },
});
