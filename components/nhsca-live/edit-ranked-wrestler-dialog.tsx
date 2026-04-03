"use client"

import type React from "react"

import { useState } from "react"
import type { RankedWrestler } from "@/lib/nhsca-live/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateRankedWrestler } from "@/app/nhsca/live/actions/ranked-actions"
import { useRouter } from "next/navigation"

interface EditRankedWrestlerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wrestler: RankedWrestler
}

export function EditRankedWrestlerDialog({ open, onOpenChange, wrestler }: EditRankedWrestlerDialogProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await updateRankedWrestler(wrestler.id, formData)

    setLoading(false)
    if (result.success) {
      onOpenChange(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border">
        <DialogHeader>
          <DialogTitle>Edit Ranked Wrestler</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={wrestler.name} required className="glass border-border" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight_class">Weight Class</Label>
            <Select name="weight_class" defaultValue={wrestler.weight_class} required>
              <SelectTrigger className="glass border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["106", "113", "120", "126", "132", "138", "145", "152", "160", "170", "182", "195", "220", "285"].map(
                  (weight) => (
                    <SelectItem key={weight} value={weight}>
                      {weight} lbs
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ranking">National Ranking</Label>
            <Input
              id="ranking"
              name="ranking"
              type="number"
              min="1"
              defaultValue={wrestler.ranking || ""}
              required
              className="glass border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              name="state"
              defaultValue={wrestler.state || ""}
              placeholder="e.g., PA, NJ, CA"
              className="glass border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team">Team</Label>
            <Input
              id="team"
              name="team"
              defaultValue={wrestler.team || ""}
              placeholder="e.g., Blair Academy"
              className="glass border-border"
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-primary text-primary-foreground">
              {loading ? "Updating..." : "Update Wrestler"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
