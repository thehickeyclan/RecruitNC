import { redirect } from "next/navigation"

/** Legacy URL — public tournament archive (hub remains at /national-team/hub). */
export default function NHSCADuals2026Page() {
  redirect("/national-team/nhsca-duals-2026-results")
}
