import { redirect } from "next/navigation"

/**
 * NHSCA 2026: single destination is the Team Hub. Event info, roster, gear, and chat
 * are all on /national-team/hub so parents have one place to go.
 */
export default function NHSCA2026Redirect() {
  redirect("/national-team/hub")
}
