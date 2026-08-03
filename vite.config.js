import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** Vite + Vitest config. Domain/storage unit tests run in jsdom for localStorage. */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
