"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock } from "lucide-react"

type Ranking = {
  rank: number
  name: string
  school: string
  weightClass: string
  record: string
}

export default function DemoRankingsClient() {
  const router = useRouter()
  const { user, loading: isLoading } = useAuth()
  const [showPreview, setShowPreview] = useState(true)

  // Mock data for demonstration
  const rankings: Ranking[] = [
    { rank: 1, name: "Alex Johnson", school: "Cary High School", weightClass: "126", record: "32-0" },
    { rank: 2, name: "Michael Smith", school: "Hough High School", weightClass: "126", record: "30-2" },
    { rank: 3, name: "David Williams", school: "Cardinal Gibbons", weightClass: "126", record: "28-3" },
    { rank: 4, name: "James Brown", school: "Laney High School", weightClass: "126", record: "27-4" },
    { rank: 5, name: "Robert Davis", school: "Jack Britt High School", weightClass: "126", record: "26-5" },
  ]

  useEffect(() => {
    if (!isLoading && !user) {
      setShowPreview(true)
    } else {
      setShowPreview(false)
    }
  }, [isLoading, user])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <h2 className="text-xl font-semibold">Loading rankings...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">NC High School Wrestling Rankings</h1>
        <p className="text-muted-foreground">126 lb Weight Class - Updated Weekly</p>
      </div>

      {showPreview ? (
        <Card className="mx-auto max-w-md text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <Lock className="h-5 w-5" />
              <span>Premium Content</span>
            </CardTitle>
            <CardDescription>Sign in to view the complete rankings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="font-medium">Preview:</p>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between rounded-md border p-2">
                  <div className="font-medium">1. Alex Johnson</div>
                  <div className="text-sm text-muted-foreground">32-0</div>
                </div>
                <div className="flex items-center justify-between rounded-md border p-2">
                  <div className="font-medium">2. Michael Smith</div>
                  <div className="text-sm text-muted-foreground">30-2</div>
                </div>
                <div className="rounded-md border p-2 bg-muted/50 text-center text-muted-foreground">
                  Sign in to view more
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => router.push("/auth/signin?redirect=/auth/demo-rankings")}>
              Sign In to View Full Rankings
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Complete Rankings</CardTitle>
              <CardDescription>Full access to NC High School Wrestling Rankings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left">Rank</th>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">School</th>
                      <th className="px-4 py-2 text-left">Weight</th>
                      <th className="px-4 py-2 text-left">Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((wrestler) => (
                      <tr key={wrestler.rank} className="border-b">
                        <td className="px-4 py-2">{wrestler.rank}</td>
                        <td className="px-4 py-2 font-medium">{wrestler.name}</td>
                        <td className="px-4 py-2">{wrestler.school}</td>
                        <td className="px-4 py-2">{wrestler.weightClass}</td>
                        <td className="px-4 py-2">{wrestler.record}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
