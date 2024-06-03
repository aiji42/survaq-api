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
  server: {
    proxy: {
      '^/sandbox/.*': 'http://localhost:8787',
      '^/status/.*': 'http://localhost:8787',
      '^/products/.*': 'http://localhost:8787',
      '^/cancellation/.*': 'http://localhost:8787',
      '^/logiless/.*': 'http://localhost:8787',
      '^/schedule/.*': 'http://localhost:8787',
      '^/webhook/.*': 'http://localhost:8787',
      '^/oauth/.*': 'http://localhost:8787',
    },
  },
});
