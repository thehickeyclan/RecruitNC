"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Archive, ArrowLeft, Calendar } from "lucide-react"
import Link from "next/link"
import { StateChampionsTabs } from "@/components/state-champions-tabs"

export default function NCHSAAArchivePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/nchsaa">
            <Button
              variant="outline"
              size="sm"
              className="border-[#B91C1C] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white bg-transparent"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Overview
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-[#03154c]">NCHSAA Digital Archive</h1>
            <p className="text-slate-600">Search and explore historical state championship results</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link href="/nchsaa/2026">
            <Card className="border-2 border-[#002147] hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="bg-[#002147] text-white p-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="w-4 h-4" />
                  2026 Results
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-slate-600 text-sm">View 2026 State Championship results</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/nchsaa/2025">
            <Card className="border-2 border-[#B31B1B] hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="bg-[#B31B1B] text-white p-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="w-4 h-4" />
                  2025 Results
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-slate-600 text-sm">View 2025 State Championship results</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/nchsaa">
            <Card className="border-2 border-gray-300 hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="bg-gray-100 p-4">
                <CardTitle className="flex items-center gap-2 text-base text-gray-800">
                  <Archive className="w-4 h-4" />
                  Tournament Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-slate-600 text-sm">NCHSAA State Championships overview</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <StateChampionsTabs />
      </div>
    </div>
  )
}
