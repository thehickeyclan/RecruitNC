// Builds the helper into extension/dist. Load extension/ as an unpacked extension in Chrome
// (chrome://extensions, Developer mode, "Load unpacked"). `node extension/build.mjs`
import { build } from "esbuild"

await build({
  entryPoints: { content: "extension/src/content.ts", background: "extension/src/background.ts", popup: "extension/src/popup.ts", page: "extension/src/page.ts" },
  outdir: "extension/dist",
  bundle: true,
  format: "iife",
  target: "chrome110",
  minify: false,
  logLevel: "info",
})
