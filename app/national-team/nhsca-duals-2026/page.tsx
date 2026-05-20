import { redirect } from "next/navigation"

/** Legacy share URL — redirects to hub (requires RecruitNC sign-in). */
export default function NHSCADuals2026OpenPage() {
  redirect("/national-team/hub")
}
