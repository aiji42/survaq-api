import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: './src/entries/web-components.ts',
      output: {
        entryFileNames: `web-components.js`,
      }
    },
    outDir: './assets/static',
  },
});
