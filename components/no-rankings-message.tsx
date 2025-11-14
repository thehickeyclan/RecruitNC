import Link from "next/link"
import { Button } from "@/components/ui/button"

interface NoRankingsMessageProps {
  year: number
  showAdminLink?: boolean
}

export function NoRankingsMessage({ year, showAdminLink = false }: NoRankingsMessageProps) {
  return (
    <div className="my-12 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
      <h2 className="mb-2 text-xl font-semibold">No Rankings Available Yet</h2>
      <p className="mb-6 text-gray-600">
        We're currently compiling our prospect rankings for the class of {year}. Check back soon for updates!
      </p>
      {showAdminLink && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-gray-500">Admin: Initialize rankings database</p>
          <Link href="/admin/init-rankings">
            <Button variant="outline" size="sm">
              Initialize Rankings Database
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
