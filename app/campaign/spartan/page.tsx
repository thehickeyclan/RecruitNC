import { redirect } from "next/navigation"

/** PRD alias — same experience as `/spartan`. */
export default function CampaignSpartanRedirectPage() {
  redirect("/spartan")
}
