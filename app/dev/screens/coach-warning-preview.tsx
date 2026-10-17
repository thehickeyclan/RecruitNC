"use client"

import { CoachComposeDialog } from "@/components/coach-messages/coach-message-button"
import { messagingRule } from "@/lib/coach-messages-compliance"

/** The compose box a Division I coach sees for a Class of 2029 boy: for screenshots only. */
export function CoachWarningPreview() {
  return (
    <CoachComposeDialog
      athleteId="example"
      athleteName="Jordan Example"
      open
      onOpenChange={() => undefined}
      previewCompliance={messagingRule({ division: "NCAA Division I", gender: "Male", classYear: 2029, firstName: "Jordan" })}
    />
  )
}
