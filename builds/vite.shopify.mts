import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // @ts-ignore
  plugins: [react()],
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: './src/entries/shopify.tsx',
      output: {
        entryFileNames: `shopify-entry.js`,
      }
    },
    outDir: './assets/static',
  },
});
