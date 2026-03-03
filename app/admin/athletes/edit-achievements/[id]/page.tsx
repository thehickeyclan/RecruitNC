"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Label } from "@/components/ui/label"

interface Athlete {
  id: string
  name: string
  achievements: string[]
  highschool?: string
  college?: string
}

export default function EditAchievementsPage({ params }: { params: { id: string } }) {
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [achievements, setAchievements] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    async function fetchAthlete() {
      try {
        const response = await fetch(`/api/athletes/${params.id}`)
        if (!response.ok) {
          throw new Error("Failed to fetch athlete")
        }
        const data = await response.json()
        setAthlete(data)

        // Convert achievements array to text (one per line)
        if (data.achievements && Array.isArray(data.achievements)) {
          setAchievements(data.achievements.join("\n"))
        }
      } catch (error) {
        console.error("Error fetching athlete:", error)
        toast({
          title: "Error",
          description: "Failed to load athlete data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAthlete()
  }, [params.id, toast])

  const handleSave = async () => {
    if (!athlete) return

    setSaving(true)
    try {
      // Convert text to achievements array (split by lines, filter empty)
      const achievementsArray = achievements
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

      const response = await fetch(`/api/athletes/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          achievements: achievementsArray,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update achievements")
      }

      toast({
        title: "Success",
        description: "Achievements updated successfully",
      })

      window.location.href = "/admin/athletes"
    } catch (error) {
      console.error("Error updating achievements:", error)
      toast({
        title: "Error",
        description: "Failed to update achievements",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">Loading athlete data...</div>
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center text-red-500">Athlete not found</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Edit Achievements</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {athlete.name}
            {athlete.highschool && (
              <span className="text-sm font-normal text-gray-600 ml-2">from {athlete.highschool}</span>
            )}
            {athlete.college && <span className="text-sm font-normal text-gray-600 ml-2">→ {athlete.college}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="achievements">Achievements (one per line)</Label>
            <Textarea
              id="achievements"
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              placeholder="Enter achievements, one per line:&#10;2x State Champion&#10;4x State Finalist&#10;NHSCA All American"
              rows={10}
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-2">
              Enter each achievement on a separate line. Examples:
              <br />• 2x State Champion
              <br />• 4x State Finalist
              <br />• NHSCA All American
              <br />• 3x State Placer
            </p>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Achievements"}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>

          {/* Preview */}
          {achievements.trim() && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Preview:</h3>
              <ul className="list-disc list-inside space-y-1">
                {achievements
                  .split("\n")
                  .map((line) => line.trim())
                  .filter((line) => line.length > 0)
                  .map((achievement, index) => (
                    <li key={index} className="text-sm">
                      {achievement}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
