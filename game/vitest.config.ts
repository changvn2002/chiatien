import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Suite RIÊNG cho game mode — không đụng vitest.config.ts gốc của app.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '..'),
    },
  },
  test: {
    environment: 'node',
    include: ['game/**/*.spec.ts'],
    // Các test phân phối chạy hàng nghìn ván mô phỏng thuần TS — cần trần
    // cao hơn mặc định 5s của vitest (đo thực tế trên VM 2 vCPU).
    testTimeout: 180_000,
    hookTimeout: 180_000,
  },
});
