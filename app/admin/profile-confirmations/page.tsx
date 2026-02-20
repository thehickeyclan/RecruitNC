"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, Users, TrendingUp, Copy, ExternalLink } from "lucide-react"

interface Athlete {
  id: string
  displayName: string
  highschool: string
  college: string
  division: string
  graduationyear: number
  photourl: string
  headshot_url: string
  instagramHandle: string
  contactEmail: string
  isConfirmed: boolean
  confirmedAt: string | null
  confirmedBy: {
    name: string
    email: string
    phone: string
  } | null
}

interface ProfileData {
  confirmed: Athlete[]
  unconfirmed: Athlete[]
  stats: {
    total: number
    confirmed: number
    unconfirmed: number
    confirmationRate: number
  }
}

export default function ProfileConfirmationsPage() {
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/profile-confirmations")
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setError(null)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const instagramMessage = (athlete: Athlete) => {
    return `Hey ${athlete.displayName.split(" ")[0]}! 👋 

Congrats on your commitment to ${athlete.college}! 🎉

We featured you on NC Wrestling Commits and want to make sure your profile is accurate. Could you confirm your details and maybe win some free gear? 

Check it out: ${window.location.origin}/athletes/${athlete.id}

Thanks! 🤼‍♂️`
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Loading profile confirmations...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8 text-red-600">
          Error: {error}
          <Button onClick={fetchData} className="ml-4">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">No data available</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profile Confirmations</h1>
        <Button onClick={fetchData} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Athletes</p>
                <p className="text-2xl font-bold">{data.stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">{data.stats.confirmed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Unconfirmed</p>
                <p className="text-2xl font-bold text-red-600">{data.stats.unconfirmed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Confirmation Rate</p>
                <p className="text-2xl font-bold text-purple-600">{data.stats.confirmationRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Athletes Tabs */}
      <Tabs defaultValue="unconfirmed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="unconfirmed">Unconfirmed ({data.stats.unconfirmed})</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed ({data.stats.confirmed})</TabsTrigger>
        </TabsList>

        <TabsContent value="unconfirmed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Athletes to Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {data.unconfirmed.map((athlete) => (
                  <div key={athlete.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <img
                        src={athlete.headshot_url || athlete.photourl || "/placeholder.svg?height=50&width=50"}
                        alt={athlete.displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-semibold">{athlete.displayName}</h3>
                        <p className="text-sm text-gray-600">
                          {athlete.highschool} → {athlete.college}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{athlete.division}</Badge>
                          <Badge variant="secondary">Class of {athlete.graduationyear}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {athlete.instagramHandle && (
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(instagramMessage(athlete))}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Message
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/athletes/${athlete.id}`, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Profile
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/view-profile?id=${encodeURIComponent(athlete.id)}`, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Unified Profile
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="confirmed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Confirmed Athletes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {data.confirmed.map((athlete) => (
                  <div key={athlete.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                    <div className="flex items-center space-x-4">
                      <img
                        src={athlete.headshot_url || athlete.photourl || "/placeholder.svg?height=50&width=50"}
                        alt={athlete.displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-semibold">{athlete.displayName}</h3>
                        <p className="text-sm text-gray-600">
                          {athlete.highschool} → {athlete.college}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{athlete.division}</Badge>
                          <Badge variant="secondary">Class of {athlete.graduationyear}</Badge>
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Confirmed
                          </Badge>
                        </div>
                        {athlete.confirmedBy && (
                          <p className="text-xs text-gray-500 mt-1">
                            Confirmed by {athlete.confirmedBy.name} on{" "}
                            {new Date(athlete.confirmedAt!).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/athletes/${athlete.id}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/view-profile?id=${encodeURIComponent(athlete.id)}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Unified Profile
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
