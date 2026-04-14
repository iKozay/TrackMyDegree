/// <reference types="vitest" />
/// <reference types="vite/client" />

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared/types"),
    },
  },
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
