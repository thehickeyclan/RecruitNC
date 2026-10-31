/**
 * The app's push alerts open /news/<slug> in the web sheet (recruitnc-mobile news/[slug]), a
 * route every shipped app version has. This slug is the Command Center.
 */
import { redirect } from "next/navigation"

export default function Super32LiveNews() {
  redirect("/super32/live")
}
