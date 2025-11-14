"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, User, Calendar, MapPin, Trophy, Search, CheckCircle, XCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Athlete {
  id: string
  name: string
  high_school?: string
  club?: string
  college?: string
  graduation_year?: number
  weight_class?: string
  gender?: string
  created_at: string
  updated_at: string
}

export default function CheckSantiagoPage() {
  const [loading, setLoading] = useState(true)
  const [santiagoData, setSantiagoData] = useState<Athlete | null>(null)
  const [recentAthletes, setRecentAthletes] = useState<Athlete[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Search for Santiago Ruiz-Diaz specifically
      const { data: santiagoResults, error: santiagoError } = await supabase
        .from("athletes")
        .select("*")
        .ilike("name", "%santiago%ruiz%")
        .order("created_at", { ascending: false })
        .limit(1)

      if (santiagoError) {
        console.error("Error searching for Santiago:", santiagoError)
      } else if (santiagoResults && santiagoResults.length > 0) {
        setSantiagoData(santiagoResults[0])
      }

      // Get recent athletes (last 10)
      const { data: recentData, error: recentError } = await supabase
        .from("athletes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)

      if (recentError) {
        console.error("Error fetching recent athletes:", recentError)
        setError("Failed to load recent athletes")
      } else {
        setRecentAthletes(recentData || [])
      }

      // Get total count
      const { count, error: countError } = await supabase.from("athletes").select("*", { count: "exact", head: true })

      if (countError) {
        console.error("Error getting count:", countError)
      } else {
        setTotalCount(count || 0)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      setError("Failed to load athlete data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-nc-blue via-slate-900 to-nc-red">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 animate-spin text-nc-gold mx-auto mb-4" />
              <span className="text-white text-lg">Checking for Santiago Ruiz-Diaz...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-nc-blue via-slate-900 to-nc-red">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Santiago Ruiz-Diaz Check</h1>
              <p className="text-gray-300 text-lg">Verify if the athlete was created successfully</p>
            </div>
            <Button
              onClick={loadData}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="bg-red-900/50 border-red-500 text-white">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Santiago Results */}
          <Card className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-nc-blue">
                <Search className="h-5 w-5" />
                Santiago Ruiz-Diaz Search Results
                {santiagoData ? (
                  <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 ml-auto" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {santiagoData ? (
                <div className="space-y-4">
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      ✅ Santiago Ruiz-Diaz was found in the database!
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-nc-blue" />
                        <span className="font-semibold">Name:</span>
                        <span>{santiagoData.name}</span>
                      </div>

                      {santiagoData.high_school && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-nc-blue" />
                          <span className="font-semibold">High School:</span>
                          <span>{santiagoData.high_school}</span>
                        </div>
                      )}

                      {santiagoData.club && (
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-nc-blue" />
                          <span className="font-semibold">Club:</span>
                          <span>{santiagoData.club}</span>
                        </div>
                      )}

                      {santiagoData.college && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-nc-blue" />
                          <span className="font-semibold">College:</span>
                          <span>{santiagoData.college}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {santiagoData.graduation_year && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-nc-blue" />
                          <span className="font-semibold">Graduation Year:</span>
                          <Badge variant="outline">{santiagoData.graduation_year}</Badge>
                        </div>
                      )}

                      {santiagoData.weight_class && (
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-nc-blue" />
                          <span className="font-semibold">Weight Class:</span>
                          <Badge variant="outline">{santiagoData.weight_class}</Badge>
                        </div>
                      )}

                      {santiagoData.gender && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-nc-blue" />
                          <span className="font-semibold">Gender:</span>
                          <Badge variant="outline">{santiagoData.gender}</Badge>
                        </div>
                      )}

                      <div className="text-sm text-gray-600">
                        <p>Created: {new Date(santiagoData.created_at).toLocaleString()}</p>
                        <p>Updated: {new Date(santiagoData.updated_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    ❌ Santiago Ruiz-Diaz was not found in the database.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Recent Athletes */}
          <Card className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-nc-blue">
                <User className="h-5 w-5" />
                Recent Athletes
                <Badge variant="outline" className="ml-auto">
                  {totalCount} total
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentAthletes.length > 0 ? (
                <div className="space-y-3">
                  {recentAthletes.map((athlete) => (
                    <div key={athlete.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="font-medium text-nc-blue">{athlete.name}</div>
                        {athlete.high_school && (
                          <Badge variant="secondary" className="text-xs">
                            {athlete.high_school}
                          </Badge>
                        )}
                        {athlete.college && (
                          <Badge variant="outline" className="text-xs">
                            {athlete.college}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{new Date(athlete.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No recent athletes found</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
