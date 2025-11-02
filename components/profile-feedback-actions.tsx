"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit3, ShieldCheck } from "lucide-react"

interface ProfileFeedbackActionsProps {
  athleteId: string
  athleteName: string
}

/**
 * Renders public-facing actions under an athlete profile:
 * - Request Edit: prominent red action
 * Removed claim profile functionality
 */
export default function ProfileFeedbackActions({ athleteId, athleteName }: ProfileFeedbackActionsProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-gray-700 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Help us keep this profile accurate</p>
              <p className="text-sm text-gray-600">Suggest corrections or claim the profile if you are this athlete.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <Link href={`/athletes/${athleteId}/edit-request`} className="flex-1">
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                aria-label="Request an edit to this profile"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Request Edit
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
