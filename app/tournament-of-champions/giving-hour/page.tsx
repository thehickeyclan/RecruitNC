import type { Metadata } from "next"

import { GivingHourScript } from "@/components/toc/giving-hour-script"
import {
  GIVING_HOUR_CLOSING,
  GIVING_HOUR_MC,
  GIVING_HOUR_OPENING,
  GIVING_HOUR_SPONSORS,
  GIVING_HOUR_THANKS,
  GIVING_HOUR_TIME,
  givingHourDrawCount,
} from "@/lib/toc/giving-hour"

export const metadata: Metadata = {
  title: "The Giving Hour | Tournament of Champions 2026",
  description:
    "The sponsors of the NC United Tournament of Champions and what they are giving away during Saturday's Giving Hour.",
}

/**
 * The Giving Hour script — built to be read from a phone at the microphone.
 *
 * Public on purpose: sponsors can see their own card, and the MC needs no account. Large type,
 * one sponsor per card, and a Drawn tick per prize kept on the reader's own phone.
 */
export default function GivingHourPage() {
  return (
    <GivingHourScript
      time={GIVING_HOUR_TIME}
      mc={GIVING_HOUR_MC}
      opening={GIVING_HOUR_OPENING}
      sponsors={GIVING_HOUR_SPONSORS}
      thanks={GIVING_HOUR_THANKS}
      closing={GIVING_HOUR_CLOSING}
      drawCount={givingHourDrawCount()}
    />
  )
}
