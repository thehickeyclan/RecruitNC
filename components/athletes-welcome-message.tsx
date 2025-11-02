import { Info, RotateCw } from "lucide-react"
import Link from "next/link"

export function AthletesWelcomeMessage() {
  return (
    <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800 relative">
      {/* Submit New Commitment button positioned in the top right */}
      <div className="absolute right-4 top-4 md:right-4 md:top-4">
        <Link
          href="/submit-commitment"
          className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Submit New Commitment
        </Link>
      </div>

      <div className="flex items-start pr-0 md:pr-40">
        <Info className="mr-3 h-5 w-5 flex-shrink-0 text-blue-500" />
        <div>
          <h3 className="mb-2 font-semibold">Welcome to North Carolina's Committed Athletes Page</h3>
          <p className="mb-2">
            <span className="font-medium">Interact with athlete cards:</span> Flip cards{" "}
            <RotateCw className="inline h-4 w-4 text-blue-600" /> to see a quick glimpse of each athlete's profile.
            Click "View Full Profile" for complete details.
          </p>
        </div>
      </div>
    </div>
  )
}
