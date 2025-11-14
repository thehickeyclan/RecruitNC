"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PlusCircle, Info } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export function EditInfoBanner() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="bg-[#FFD700] text-gray-800 p-4 rounded-lg mb-8 shadow-md">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="mb-4 md:mb-0 md:mr-4 flex items-start">
          <Info size={24} className="mr-2 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-xl font-bold">Help Keep Our Database Current</h3>
            <p className="text-gray-700">
              To request an edit for an athlete, click on their profile and use the "Request Edit" button.
            </p>
          </div>
        </div>
        <div>
          <Link href="/submit-commitment">
            <Button className="bg-[#c8102e] hover:bg-[#a50d25] text-white flex items-center gap-2 whitespace-nowrap">
              <PlusCircle size={18} />
              Submit New Commitment
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
