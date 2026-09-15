import type { Metadata } from "next"

import { GivingHourScript } from "@/components/toc/giving-hour-script"
import {
  GIVING_HOUR_SCHOLARSHIP,
  GIVING_HOUR_MC,
  GIVING_HOUR_OPENING,
  GIVING_HOUR_SPONSORS,
  GIVING_HOUR_THANKS,
  GIVING_HOUR_TIME,
  GIVING_HOUR_WITH_EVERY_PRIZE,
  givingHourDrawCount,
} from "@/lib/toc/giving-hour"

export const metadata: Metadata = {
  title: "The Giving Hour | Tournament of Champions 2026",
  description: "The Giving Hour script: the Caden Perry Warrior Scholarship, sponsor raffles and thank-yous.",
  robots: { index: false, follow: false },
}

/**
 * The Giving Hour script, read from a phone at the microphone. Lives under the staff hub; the old
 * /tournament-of-champions/giving-hour link redirects to the hub.
 */
export default function StaffGivingHourPage() {
  return (
    <GivingHourScript
      time={GIVING_HOUR_TIME}
      mc={GIVING_HOUR_MC}
      opening={GIVING_HOUR_OPENING}
      sponsors={GIVING_HOUR_SPONSORS}
      thanks={GIVING_HOUR_THANKS}
      scholarship={GIVING_HOUR_SCHOLARSHIP}
      drawCount={givingHourDrawCount()}
      withEveryPrize={GIVING_HOUR_WITH_EVERY_PRIZE}
    />
  )
}
