import { defineConfig } from "vite";

const buildMaps = {
  webComponents: {
    'web-components': './src/entries/web-components.ts',
  },
  shopify: {
    'shopify-entry': './src/entries/shopify.tsx',
  },
  portal: {
    'portal': './src/entries/portal.tsx',
  },
}

export default defineConfig(({ mode, command }) => {
  let input = {}
  if (command === 'build') input = buildMaps[mode as keyof typeof buildMaps]

  return {
    build: {
      emptyOutDir: false,
      rollupOptions: {
        input,
        output: {
          entryFileNames: `[name].js`,
        }
      },
      outDir: './assets/static',
    },
    test: {},
    server: {
      proxy: {
        '^/(sandbox|portal|products|cancellation|logiless|schedule|webhook|oauth)(/|$)': 'http://localhost:8787',
      }
    }
  }
});