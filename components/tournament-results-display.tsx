"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trophy } from "lucide-react"

interface TournamentResult {
  year: number
  placement: string
  record?: string
  weight?: string
  division?: string
  notes?: string
}

interface NCHSAAResult {
  year: number
  place: number | null | undefined
  classification: string
  weight_class: string
}

interface TournamentResultsDisplayProps {
  nhscaResults?: TournamentResult[]
  super32Results?: TournamentResult[]
  nchsaaResults?: NCHSAAResult[] // State championship data
  compact?: boolean // For smaller displays like cards
}

export function TournamentResultsDisplay({
  nhscaResults = [],
  super32Results = [],
  nchsaaResults = [],
  compact = false,
}: TournamentResultsDisplayProps) {
  const hasAnyResults = nhscaResults.length > 0 || super32Results.length > 0 || nchsaaResults.length > 0

  if (!hasAnyResults) {
    return null // Don't show section if no tournament data
  }

  const getPlacementBadge = (placement: string | null | undefined, size: 'default' | 'sm' = 'default') => {
    if (!placement) {
      return <span className="text-gray-400">—</span>
    }
    
    const p = placement.toLowerCase()
    const badgeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : ''
    
    if (p === "champion" || p === "1st" || p === "1") {
      return <Badge className={`bg-yellow-500 text-white hover:bg-yellow-600 ${badgeClass}`}>🥇 {placement}</Badge>
    }
    if (p === "finalist" || p === "2nd" || p === "2") {
      return <Badge className={`bg-gray-400 text-white hover:bg-gray-500 ${badgeClass}`}>🥈 {placement}</Badge>
    }
    if (p === "3rd" || p === "3") {
      return <Badge className={`bg-amber-600 text-white hover:bg-amber-700 ${badgeClass}`}>🥉 {placement}</Badge>
    }
    if (["4th", "5th", "6th", "7th", "8th", "4", "5", "6", "7", "8"].includes(p)) {
      return <Badge className={`bg-[#002147] text-white hover:bg-[#003366] ${badgeClass}`}>{placement}</Badge>
    }
    return <Badge variant="outline" className={badgeClass}>{placement}</Badge>
  }

  // Compact version for cards/smaller displays
  if (compact) {
    return (
      <div className="space-y-4">
        {nhscaResults.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#002147]" />
              NHSCA National Championship
            </h4>
            <div className="space-y-2">
              {nhscaResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">{result.year}</span>
                    {getPlacementBadge(result.placement, 'sm')}
                  </div>
                  {result.record && (
                    <span className="text-gray-600 font-mono">{result.record}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {super32Results.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#B31B1B]" />
              Super 32
            </h4>
            <div className="space-y-2">
              {super32Results.map((result, index) => (
                <div key={index} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">{result.year}</span>
                    {getPlacementBadge(result.placement, 'sm')}
                  </div>
                  {result.record && (
                    <span className="text-gray-600 font-mono">{result.record}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Full table version for profiles
  return (
    <div className="space-y-6">
      {nchsaaResults.length > 0 && (
        <Card className="border-t-4 border-t-yellow-500 shadow-md">
          <CardHeader className="bg-gradient-to-r from-yellow-500 to-amber-500 py-4">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5" />
              NCHSAA State Championships
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Year</TableHead>
                    <TableHead className="font-semibold">Placement</TableHead>
                    <TableHead className="font-semibold">Classification</TableHead>
                    <TableHead className="font-semibold">Weight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nchsaaResults.map((result, index) => {
                    let placementText: string
                    if (result.place === null || result.place === undefined) {
                      placementText = "SQ"
                    } else if (result.place === 1) {
                      placementText = "Champion"
                    } else if (result.place === 2) {
                      placementText = "2nd Place"
                    } else if (result.place === 3) {
                      placementText = "3rd Place"
                    } else {
                      placementText = `${result.place}th Place`
                    }
                    
                    return (
                      <TableRow key={index} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-semibold text-yellow-600">{result.year}</TableCell>
                        <TableCell>{getPlacementBadge(placementText)}</TableCell>
                        <TableCell>{result.classification}</TableCell>
                        <TableCell>{result.weight_class}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {nhscaResults.length > 0 && (
        <Card className="border-t-4 border-t-[#002147] shadow-md">
          <CardHeader className="bg-gradient-to-r from-[#002147] to-[#003366] py-4">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5" />
              NHSCA National Championship
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Year</TableHead>
                    <TableHead className="font-semibold">Placement</TableHead>
                    <TableHead className="font-semibold">Record</TableHead>
                    <TableHead className="font-semibold">Weight</TableHead>
                    <TableHead className="font-semibold">Division</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nhscaResults.map((result, index) => (
                    <TableRow key={index} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-semibold text-[#002147]">{result.year}</TableCell>
                      <TableCell>{getPlacementBadge(result.placement)}</TableCell>
                      <TableCell className="font-mono">{result.record || "—"}</TableCell>
                      <TableCell>{result.weight || "—"}</TableCell>
                      <TableCell>{result.division || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {super32Results.length > 0 && (
        <Card className="border-t-4 border-t-[#B31B1B] shadow-md">
          <CardHeader className="bg-gradient-to-r from-[#B31B1B] to-[#8B1515] py-4">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5" />
              Super 32
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Year</TableHead>
                    <TableHead className="font-semibold">Placement</TableHead>
                    <TableHead className="font-semibold">Record</TableHead>
                    <TableHead className="font-semibold">Weight</TableHead>
                    <TableHead className="font-semibold">Division</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {super32Results.map((result, index) => (
                    <TableRow key={index} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-semibold text-[#B31B1B]">{result.year}</TableCell>
                      <TableCell>{getPlacementBadge(result.placement)}</TableCell>
                      <TableCell className="font-mono">{result.record || "—"}</TableCell>
                      <TableCell>{result.weight || "—"}</TableCell>
                      <TableCell>{result.division || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
