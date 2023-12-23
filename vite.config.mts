import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {},
  build: {
    lib: {
      entry: './src/web-components/index.ts',
      name: 'survaqWC',
      formats: ['umd']
    },
    rollupOptions: {
      output: {
        entryFileNames: `web-components.js`,
      }
    },
    outDir: './assets/static',
  },
});
