"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Eye, Send, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { AdminHeader } from "@/components/admin-header"

interface DraftRanking {
  id: string
  athlete_id: string
  athlete_name: string
  prospect_ranking: number
  graduation_year: number
  gender: string
  weight_class: string
  ranking_notes?: string
  created_at: string
  created_by_name: string
}

interface PublishedRanking {
  id: string
  athlete_id: string
  athlete_name: string
  prospect_ranking: number
  graduation_year: number
  gender: string
  weight_class: string
  published_at: string
  published_by_name: string
}

export default function RankingsPublishPage() {
  const [selectedYear, setSelectedYear] = useState<string>("2025")
  const [selectedGender, setSelectedGender] = useState<string>("Male")
  const [draftRankings, setDraftRankings] = useState<DraftRanking[]>([])
  const [publishedRankings, setPublishedRankings] = useState<PublishedRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)

  const availableYears = ["2025", "2026", "2027", "2028"]
  const genderOptions = ["Male", "Female"]

  useEffect(() => {
    fetchRankings()
  }, [selectedYear, selectedGender])

  const fetchRankings = async () => {
    try {
      setLoading(true)

      // Fetch draft rankings
      const draftResponse = await fetch(`/api/admin/rankings/draft?year=${selectedYear}&gender=${selectedGender}`)
      if (draftResponse.ok) {
        const draftData = await draftResponse.json()
        setDraftRankings(draftData.draftRankings || [])
      }

      // Fetch published rankings
      const publishedResponse = await fetch(
        `/api/admin/rankings/published?year=${selectedYear}&gender=${selectedGender}`,
      )
      if (publishedResponse.ok) {
        const publishedData = await publishedResponse.json()
        setPublishedRankings(publishedData.publishedRankings || [])
      }
    } catch (error) {
      console.error("Error fetching rankings:", error)
      toast.error("Failed to load rankings")
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    try {
      setPublishing(true)

      const response = await fetch("/api/admin/rankings/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          graduationYear: Number.parseInt(selectedYear),
          gender: selectedGender,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        fetchRankings() // Refresh data
      } else {
        throw new Error("Failed to publish rankings")
      }
    } catch (error) {
      console.error("Error publishing rankings:", error)
      toast.error("Failed to publish rankings")
    } finally {
      setPublishing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading rankings...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Publish Rankings</h1>
          <p className="text-gray-600">Review and publish prospect rankings</p>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Rankings to Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <Select value={selectedGender} onValueChange={setSelectedGender}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  {genderOptions.map((gender) => (
                    <SelectItem key={gender} value={gender}>
                      {gender}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      Class of {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {draftRankings.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="ml-auto">
                      <Send className="w-4 h-4 mr-2" />
                      Publish Rankings
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Publish Rankings</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to publish the {selectedGender} Class of {selectedYear} rankings? This
                        will make them visible to the public and replace any previously published rankings.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handlePublish} disabled={publishing}>
                        {publishing ? "Publishing..." : "Publish"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rankings Tabs */}
        <Tabs defaultValue="draft" className="space-y-6">
          <TabsList>
            <TabsTrigger value="draft" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Draft Rankings ({draftRankings.length})
            </TabsTrigger>
            <TabsTrigger value="published" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Published Rankings ({publishedRankings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draft">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  Draft Rankings - {selectedGender} Class of {selectedYear}
                </CardTitle>
                <p className="text-sm text-gray-600">
                  {draftRankings.length === 0
                    ? "No draft rankings found. Create rankings in the ranking management interface."
                    : "Review these draft rankings before publishing to make them visible to the public."}
                </p>
              </CardHeader>
              <CardContent>
                {draftRankings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No draft rankings available</p>
                    <Button asChild variant="outline" className="mt-4 bg-transparent">
                      <a href="/admin/prospects/ranking">Create Rankings</a>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {draftRankings.map((ranking, index) => (
                      <div
                        key={ranking.id}
                        className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                            #{ranking.prospect_ranking}
                          </Badge>
                          <div>
                            <h3 className="font-semibold">{ranking.athlete_name}</h3>
                            <p className="text-sm text-gray-600">
                              {ranking.weight_class} • Created by {ranking.created_by_name}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(ranking.created_at)}</p>
                          </div>
                        </div>
                        {ranking.ranking_notes && (
                          <div className="text-sm text-gray-600 max-w-xs">
                            <p className="italic">"{ranking.ranking_notes}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="published">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Published Rankings - {selectedGender} Class of {selectedYear}
                </CardTitle>
                <p className="text-sm text-gray-600">These rankings are currently visible to the public.</p>
              </CardHeader>
              <CardContent>
                {publishedRankings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Eye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No published rankings yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {publishedRankings.map((ranking) => (
                      <div
                        key={ranking.id}
                        className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                            #{ranking.prospect_ranking}
                          </Badge>
                          <div>
                            <h3 className="font-semibold">{ranking.athlete_name}</h3>
                            <p className="text-sm text-gray-600">
                              {ranking.weight_class} • Published by {ranking.published_by_name}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(ranking.published_at)}</p>
                          </div>
                        </div>
                        <Badge variant="default" className="bg-green-600">
                          Live
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
