import { redirect } from "next/navigation"

/**
 * The address people share for brackets. Now that the tournament has been wrestled it should show
 * what happened, not a sign-in wall in front of the seeding tool — which lives at
 * /admin/toc/brackets.
 */
export default function TocBracketsRedirect() {
  redirect("/tournament-of-champions/results")
}
