import { redirect } from "next/navigation"

/**
 * The Giving Hour script was shared at this address before the staff hub existed. It now lives at
 * /tournament-of-champions/staff/giving-hour, and anyone holding the old link lands on the hub.
 */
export default function GivingHourRedirect() {
  redirect("/tournament-of-champions/staff")
}
