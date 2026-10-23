import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.spec.ts', 'components/**/*.spec.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      // Đo toàn bộ mã nguồn thật (loại trừ .d.ts, config, test, file sinh
      // tự động) — ngưỡng theo glob đúng CQ-06 ở dưới.
      include: ['lib/**/*.ts', 'components/**/*.{ts,tsx}', 'app/**/*.tsx'],
      exclude: ['**/*.spec.*', '**/*.d.ts', 'app/layout.tsx'],
      reporter: ['text-summary', 'json-summary'],
      thresholds: {
        // Toàn repo: lines ≥ 60% (CQ-06).
        lines: 60,
        // lib/ là logic nghiệp vụ: lines ≥ 80%, branches ≥ 70% (release 1–2).
        'lib/**': {
          lines: 80,
          branches: 70,
        },
      },
    },
  },
});
