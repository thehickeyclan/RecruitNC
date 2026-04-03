"use client"

import type React from "react"

import { useState } from "react"
import type { NCWrestler } from "@/lib/nhsca-live/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateWrestler } from "@/app/nhsca/live/actions/roster-actions"
import { useRouter } from "next/navigation"

interface EditWrestlerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wrestler: NCWrestler
}

export function EditWrestlerDialog({ open, onOpenChange, wrestler }: EditWrestlerDialogProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await updateWrestler(wrestler.id, formData)

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
          <DialogTitle>Edit Wrestler</DialogTitle>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wins">Wins</Label>
              <Input
                id="wins"
                name="wins"
                type="number"
                min="0"
                defaultValue={wrestler.wins}
                required
                className="glass border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="losses">Losses</Label>
              <Input
                id="losses"
                name="losses"
                type="number"
                min="0"
                defaultValue={wrestler.losses}
                required
                className="glass border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seed">Seed</Label>
            <Input
              id="seed"
              name="seed"
              type="number"
              min="1"
              defaultValue={wrestler.seed || ""}
              className="glass border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bracket_status">Bracket Status</Label>
            <Select name="bracket_status" defaultValue={wrestler.bracket_status}>
              <SelectTrigger className="glass border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="eliminated">Eliminated</SelectItem>
                <SelectItem value="placed">Placed</SelectItem>
                <SelectItem value="champion">Champion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="placement">Placement</Label>
            <Input
              id="placement"
              name="placement"
              type="number"
              min="1"
              defaultValue={wrestler.placement || ""}
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
