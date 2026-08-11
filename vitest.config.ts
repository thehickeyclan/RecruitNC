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
      // `import "server-only"` throws outside a React Server Component, which makes any
      // server lib untestable. Stub it here so the guard still holds in the Next build
      // while the same file can be unit tested.
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
})
