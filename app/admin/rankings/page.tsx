"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminHeader } from "@/components/admin-header"
import Link from "next/link"

export default function RankingsIndexPage() {
  const router = useRouter()
  const currentYear = new Date().getFullYear()
  
  // Get upcoming graduation years (current year + next 4 years)
  const graduationYears = [
    currentYear,
    currentYear + 1,
    currentYear + 2,
    currentYear + 3,
    currentYear + 4,
  ]

  return (
    <>
      <AdminHeader />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] text-white rounded-lg p-6 shadow-lg">
            <h1 className="text-3xl font-bold">Prospect Rankings Manager</h1>
            <p className="mt-2 text-blue-100">Manage and organize wrestler rankings by graduation year</p>
          </div>
        </div>

        {/* Quick Access Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Select Graduation Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {graduationYears.map((year) => (
                <Button
                  key={year}
                  asChild
                  variant="outline"
                  className="h-20 text-lg font-semibold hover:bg-[#13294B] hover:text-white transition-colors"
                >
                  <Link href={`/admin/rankings/year/${year}`}>
                    Class of {year}
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                <strong>Rankings System:</strong> Organize and rank wrestlers by graduation year to help college
                coaches identify top talent.
              </p>
              <p>
                <strong>Features:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Overall rankings for each graduation class</li>
                <li>Style-specific rankings (Folkstyle, Freestyle, Greco)</li>
                <li>Weight class organization</li>
                <li>Verified prospect badges</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  )
}

