import { redirect } from "next/navigation"

/** Open link: redirect to full hub with ?open=1 so parents see the exact same page (banner, countdown, roster, gear sizes, etc.) without logging in. */
export default function NHSCADuals2026OpenPage() {
  redirect("/national-team/hub?open=1")
}
