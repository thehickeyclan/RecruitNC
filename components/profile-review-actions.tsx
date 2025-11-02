"use client"

import Link from "next/link"
import { MessageSquare } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import ConfirmProfileButton from "@/components/confirm-profile-button"

type Props = {
  athleteId: string
  athleteName?: string
  initiallyVerified?: boolean
}

export default function ProfileReviewActions({ athleteId, athleteName, initiallyVerified = false }: Props) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium text-gray-900">Review this profile</p>
            <p className="text-sm text-gray-600">
              If everything looks accurate, tap Good to Go. You can still make edits anytime.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Green: Good to Go (uses existing confirm endpoint/logic) */}
            <ConfirmProfileButton
              athleteId={athleteId}
              athleteName={athleteName}
              initiallyVerified={initiallyVerified}
              buttonLabel="Good to Go"
              className="bg-green-600 hover:bg-green-700 text-white"
            />

            {/* Red: Make Edits (always available) */}
            <Link href={`/athletes/${athleteId}/edit-request`} prefetch={false}>
              <Button variant="destructive" className="inline-flex items-center gap-2">
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                Make Edits
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
