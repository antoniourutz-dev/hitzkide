import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/services/playerService.ts',
        'src/services/questionService.ts',
        'src/services/clozeService.ts',
        'src/services/discourseClozeService.ts',
        'src/pages/HomePage.tsx',
        'src/pages/DailyGamePage.tsx',
        'src/pages/SessionResultPage.tsx',
        'src/pages/ClozeGamePage.tsx',
        'src/pages/DiscourseClozeGamePage.tsx',
      ],
      exclude: ['src/test/**', 'src/types/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
