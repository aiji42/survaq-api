import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    minify: false,
    bundle: true,
  },
]);
