import { redirect } from "next/navigation"

/** NHSCA 2026 event is consolidated into the Team Hub. Redirect so one URL. */
export default function NHSCA2026Redirect() {
  redirect("/national-team/hub")
}
