import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {},
  server: {
    proxy: {
      '^/sandbox/.*': 'http://localhost:8787',
      '^/status/.*': 'http://localhost:8787',
      '^/products': 'http://localhost:8787',
      '^/products/.*': 'http://localhost:8787',
      '^/cancellation/.*': 'http://localhost:8787',
      '^/logiless/.*': 'http://localhost:8787',
      '^/schedule/.*': 'http://localhost:8787',
      '^/webhook/.*': 'http://localhost:8787',
      '^/oauth/.*': 'http://localhost:8787',
    },
  },
});
