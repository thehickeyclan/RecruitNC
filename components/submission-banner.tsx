"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PlusCircle, Edit } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export function SubmissionBanner() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 rounded-lg mb-6 shadow-md">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="mb-4 md:mb-0 md:mr-4">
          <h3 className="text-xl font-bold">Submit or Update Wrestling Information</h3>
          <p className="text-blue-100">
            Help us keep our database current by submitting new commitments or requesting updates to existing profiles.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/submit-commitment">
            <Button className="bg-[#c8102e] hover:bg-[#a50d25] text-white flex items-center gap-2 whitespace-nowrap">
              <PlusCircle size={18} />
              Submit New Commitment
            </Button>
          </Link>
          <Button
            variant="outline"
            className="bg-white text-blue-800 border-white hover:bg-blue-50 flex items-center gap-2 whitespace-nowrap"
            onClick={() =>
              alert("To request an edit, click on any athlete's profile and use the 'Request Edit' button.")
            }
          >
            <Edit size={18} />
            How to Request Edits
          </Button>
        </div>
      </div>
    </div>
  )
}
