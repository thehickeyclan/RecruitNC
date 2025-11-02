"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Edit, PlusCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export function SubmissionCTA({ athleteId }: { athleteId?: string }) {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 my-6">
      <h3 className="text-xl font-bold text-blue-800 mb-3">Athlete Information Options</h3>
      <div className="flex flex-col sm:flex-row gap-3">
        {athleteId && (
          <Link href={`/athletes/${athleteId}/edit-request`} className="flex-1">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 py-6">
              <Edit size={20} />
              Request Edit for this Athlete
            </Button>
          </Link>
        )}
        <Link href="/submit-commitment" className="flex-1">
          <Button className="w-full bg-[#c8102e] hover:bg-[#a50d25] text-white flex items-center justify-center gap-2 py-6">
            <PlusCircle size={20} />
            Submit New Commitment
          </Button>
        </Link>
      </div>
      <p className="text-blue-700 mt-3 text-sm">
        All submissions are reviewed by our admin team before being published.
      </p>
    </div>
  )
}
