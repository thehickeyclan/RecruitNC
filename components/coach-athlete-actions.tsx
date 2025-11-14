"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CoachAthleteActionsProps {
  athleteId: string
  athleteName: string
}

export function CoachAthleteActions({ athleteId, athleteName }: CoachAthleteActionsProps) {
  const { isVerifiedCoach, user } = useAuth()
  const { toast } = useToast()
  const [isStarred, setIsStarred] = useState(false)
  const [note, setNote] = useState("")
  const [isLoadingStarred, setIsLoadingStarred] = useState(true)
  const [isLoadingNote, setIsLoadingNote] = useState(true)
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [isTogglingStarred, setIsTogglingStarred] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch starred status
        const starredRes = await fetch(`/api/coaches/starred-status?athleteId=${athleteId}`)
        if (starredRes.ok) {
          const starredData = await starredRes.json()
          setIsStarred(starredData.isStarred)
        }
        setIsLoadingStarred(false)

        // Fetch note
        const noteRes = await fetch(`/api/coaches/note?athleteId=${athleteId}`)
        if (noteRes.ok) {
          const noteData = await noteRes.json()
          setNote(noteData.note || "")
        }
        setIsLoadingNote(false)
      } catch (error) {
        console.error("Error fetching coach data:", error)
        setIsLoadingStarred(false)
        setIsLoadingNote(false)
      }
    }

    fetchData()
  }, [athleteId])

  // Only show for verified coaches
  if (!isVerifiedCoach) {
    return null
  }

  const toggleStar = async () => {
    setIsTogglingStarred(true)
    try {
      const res = await fetch("/api/coaches/toggle-star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId }),
      })

      if (!res.ok) throw new Error("Failed to toggle star")

      const data = await res.json()
      setIsStarred(data.isStarred)

      toast({
        title: data.isStarred ? "Athlete starred" : "Athlete unstarred",
        description: data.isStarred
          ? `${athleteName} added to your recruits`
          : `${athleteName} removed from your recruits`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update starred status",
        variant: "destructive",
      })
    } finally {
      setIsTogglingStarred(false)
    }
  }

  const saveNote = async () => {
    setIsSavingNote(true)
    try {
      const res = await fetch("/api/coaches/save-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId, note }),
      })

      if (!res.ok) throw new Error("Failed to save note")

      toast({
        title: "Note saved",
        description: "Your private note has been saved",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      })
    } finally {
      setIsSavingNote(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Star Button */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Track this athlete</h3>
              <p className="text-sm text-gray-600">Add {athleteName} to your recruiting board</p>
            </div>
            <Button
              onClick={toggleStar}
              disabled={isLoadingStarred || isTogglingStarred}
              variant={isStarred ? "default" : "outline"}
              className={isStarred ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {isTogglingStarred ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Star className={`h-4 w-4 mr-2 ${isStarred ? "fill-current" : ""}`} />
              )}
              {isStarred ? "Starred" : "Star Athlete"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Private Notes */}
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">My Private Notes</h3>
              <p className="text-sm text-gray-600">Only you can see these notes about {athleteName}</p>
            </div>

            {isLoadingNote ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add notes about this athlete's recruiting potential, conversations, evaluations, etc."
                  className="min-h-[120px]"
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
                  <Button onClick={saveNote} disabled={isSavingNote}>
                    {isSavingNote ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      "Save Note"
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
