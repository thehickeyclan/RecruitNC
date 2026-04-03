/**
 * Local gate before deploy: `npm run verify` (~1s, no Supabase).
 * Catches NHSCA merge/regressions in lib/*.test.ts. Full Next check: `npm run verify:deploy`.
 */
import path from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
