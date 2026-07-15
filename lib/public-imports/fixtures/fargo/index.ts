/**
 * Bundled Fargo exports for Vercel/serverless (fs under scripts/ is not available at runtime).
 * Keep in sync with scripts/data/fargo/exports/ when adding real SoR dumps.
 */

import juniorBoysFs2026 from "./2026-junior-boys-fs.json"
import juniorBoysGr2026 from "./2026-junior-boys-gr.json"

/** Keyed by the same local_path strings registered in fargo-events.ts */
export const FARGO_BUNDLED_EXPORTS: Record<string, unknown> = {
  "scripts/data/fargo/exports/2026-junior-boys-fs.json": juniorBoysFs2026,
  "scripts/data/fargo/exports/2026-junior-boys-gr.json": juniorBoysGr2026,
}

export function getBundledFargoExport(localPath: string | null | undefined): string | null {
  if (!localPath) return null
  const payload = FARGO_BUNDLED_EXPORTS[localPath]
  if (payload == null) return null
  return JSON.stringify(payload)
}
