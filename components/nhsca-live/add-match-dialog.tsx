"use client"

import type React from "react"

import { useState } from "react"
import type { NCWrestler, RankedWrestler } from "@/lib/nhsca-live/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addMatch } from "@/app/nhsca/live/actions/match-actions"
import { useRouter } from "next/navigation"

interface AddMatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roster: NCWrestler[]
  rankedWrestlers: RankedWrestler[]
}

export function AddMatchDialog({ open, onOpenChange, roster, rankedWrestlers }: AddMatchDialogProps) {
  const [loading, setLoading] = useState(false)
  const [selectedWrestler, setSelectedWrestler] = useState<string>("")
  const [opponentName, setOpponentName] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await addMatch(formData)

    setLoading(false)
    if (result.success) {
      onOpenChange(false)
      setSelectedWrestler("")
      setOpponentName("")
      router.refresh()
    }
  }

  const selectedWrestlerData = roster.find((w) => w.id === selectedWrestler)
  const isOpponentRanked = rankedWrestlers.some(
    (rw) =>
      rw.name.toLowerCase() === opponentName.toLowerCase() && rw.weight_class === selectedWrestlerData?.weight_class,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border">
        <DialogHeader>
          <DialogTitle>Add Live Match</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nc_wrestler_id">NC Wrestler</Label>
            <Select name="nc_wrestler_id" value={selectedWrestler} onValueChange={setSelectedWrestler} required>
              <SelectTrigger className="glass border-border">
                <SelectValue placeholder="Select NC wrestler" />
              </SelectTrigger>
              <SelectContent>
                {roster.map((wrestler) => (
                  <SelectItem key={wrestler.id} value={wrestler.id}>
                    {wrestler.name} ({wrestler.weight_class} lbs)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="opponent_name">Opponent Name</Label>
            <Input
              id="opponent_name"
              name="opponent_name"
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              required
              className="glass border-border"
            />
            {isOpponentRanked && (
              <p className="text-xs text-primary">⭐ This opponent is ranked - notable win opportunity!</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="round">Round</Label>
            <Select name="round">
              <SelectTrigger className="glass border-border">
                <SelectValue placeholder="Select round (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="R1">Round 1</SelectItem>
                <SelectItem value="R2">Round 2</SelectItem>
                <SelectItem value="R3">Round 3</SelectItem>
                <SelectItem value="Quarters">Quarterfinals</SelectItem>
                <SelectItem value="Semis">Semifinals</SelectItem>
                <SelectItem value="Finals">Finals</SelectItem>
                <SelectItem value="Consolation">Consolation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-primary text-primary-foreground">
              {loading ? "Adding..." : "Add Match"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
