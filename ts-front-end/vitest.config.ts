/// <reference types="vitest" />
/// <reference types="vite/client" />

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom", // 👈 this gives you window, document, etc.
    globals: true, // optional, lets you use describe/it/expect without imports
    setupFiles: "./src/setupTests.ts",
    css: false,
    coverage: {
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
    },
  },
});
