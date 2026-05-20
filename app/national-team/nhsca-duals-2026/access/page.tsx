import { redirect } from "next/navigation"

/** Access codes — deprecated. NHSCA hub uses RecruitNC sign-in only (no hub code). */
export default function NHSCADuals2026AccessPage() {
  redirect("/national-team/hub")
}
