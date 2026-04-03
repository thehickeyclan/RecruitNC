"use client"

import type React from "react"

import { useState } from "react"
import type { LiveMatch, NCWrestler, RankedWrestler } from "@/lib/nhsca-live/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Star, Trash2, Check, X } from "lucide-react"
import { updateMatch, deleteMatch, completeMatch } from "@/app/nhsca/live/actions/match-actions"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface MatchCardProps {
  match: LiveMatch
  roster: NCWrestler[]
  rankedWrestlers: RankedWrestler[]
  onUpdate: (match: LiveMatch) => void
  onDelete: (matchId: string) => void
}

export function MatchCard({ match, roster, rankedWrestlers, onUpdate, onDelete }: MatchCardProps) {
  const [ncScore, setNcScore] = useState(match.nc_score)
  const [opponentScore, setOpponentScore] = useState(match.opponent_score)
  const [updating, setUpdating] = useState(false)
  const router = useRouter()

  const handleScoreUpdate = async () => {
    setUpdating(true)
    const result = await updateMatch(match.id, ncScore, opponentScore)
    setUpdating(false)

    if (result.success && result.match) {
      onUpdate(result.match)
      router.refresh()
    }
  }

  const handleComplete = async (result: "win" | "loss", winType?: string) => {
    setUpdating(true)
    const completeResult = await completeMatch(match.id, result, winType)
    setUpdating(false)

    if (completeResult.success && completeResult.match) {
      onUpdate(completeResult.match)
      router.refresh()
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this match?")) return

    const result = await deleteMatch(match.id)
    if (result.success) {
      onDelete(match.id)
      router.refresh()
    }
  }

  return (
    <Card className="glass-strong border-border">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary text-primary">
              {match.weight_class} lbs
            </Badge>
            {match.round && <Badge variant="secondary">{match.round}</Badge>}
            {match.is_notable && <Star className="w-4 h-4 text-primary fill-primary" />}
            {match.status === "completed" && (
              <Badge className={match.result === "win" ? "bg-success" : "bg-destructive"}>
                {match.result?.toUpperCase()}
                {match.win_type && ` - ${match.win_type}`}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleDelete}
            className="border-destructive text-destructive hover:bg-destructive hover:text-white bg-transparent"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 items-center gap-4">
          <div className="text-right">
            <p className="font-bold text-lg text-primary">{match.nc_wrestler_name}</p>
            <p className="text-xs text-muted-foreground">NC United</p>
          </div>

          <div className="text-center">
            {match.status === "live" ? (
              <div className="flex items-center justify-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={ncScore}
                  onChange={(e) => setNcScore(Number.parseInt(e.target.value) || 0)}
                  className="w-16 text-center glass border-border"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  min="0"
                  value={opponentScore}
                  onChange={(e) => setOpponentScore(Number.parseInt(e.target.value) || 0)}
                  className="w-16 text-center glass border-border"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl font-bold text-primary">{match.nc_score}</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-2xl font-bold">{match.opponent_score}</span>
              </div>
            )}
          </div>

          <div className="text-left">
            <p className="font-bold text-lg">{match.opponent_name}</p>
            {match.is_notable && <p className="text-xs text-primary">Ranked Opponent</p>}
          </div>
        </div>

        {match.status === "live" && (
          <div className="space-y-3">
            <Button
              onClick={handleScoreUpdate}
              disabled={updating}
              className="w-full bg-secondary text-secondary-foreground"
            >
              Update Score
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <CompleteMatchButton
                label="Win"
                result="win"
                icon={Check}
                onComplete={handleComplete}
                disabled={updating}
              />
              <CompleteMatchButton
                label="Loss"
                result="loss"
                icon={X}
                onComplete={handleComplete}
                disabled={updating}
                variant="destructive"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface CompleteMatchButtonProps {
  label: string
  result: "win" | "loss"
  icon: React.ElementType
  onComplete: (result: "win" | "loss", winType?: string) => void
  disabled: boolean
  variant?: "default" | "destructive"
}

function CompleteMatchButton({ label, result, icon: Icon, onComplete, disabled, variant }: CompleteMatchButtonProps) {
  const [showWinType, setShowWinType] = useState(false)

  if (result === "win" && showWinType) {
    return (
      <div className="col-span-2 space-y-2">
        <Select onValueChange={(value) => onComplete(result, value)}>
          <SelectTrigger className="glass border-border">
            <SelectValue placeholder="Select win type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pin">Pin</SelectItem>
            <SelectItem value="tech">Tech Fall</SelectItem>
            <SelectItem value="major">Major Decision</SelectItem>
            <SelectItem value="decision">Decision</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setShowWinType(false)} className="w-full">
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <Button
      onClick={() => (result === "win" ? setShowWinType(true) : onComplete(result))}
      disabled={disabled}
      variant={variant}
      className="w-full"
    >
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </Button>
  )
}
