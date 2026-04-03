"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addWrestler } from "@/app/nhsca/live/actions/roster-actions"
import { useRouter } from "next/navigation"

interface AddWrestlerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddWrestlerDialog({ open, onOpenChange }: AddWrestlerDialogProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await addWrestler(formData)

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
          <DialogTitle>Add New Wrestler</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required className="glass border-border" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight_class">Weight Class</Label>
            <Select name="weight_class" required>
              <SelectTrigger className="glass border-border">
                <SelectValue placeholder="Select weight class" />
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
            <Label htmlFor="seed">Seed (Optional)</Label>
            <Input id="seed" name="seed" type="number" min="1" className="glass border-border" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bracket_status">Bracket Status</Label>
            <Select name="bracket_status" defaultValue="active">
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

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-primary text-primary-foreground">
              {loading ? "Adding..." : "Add Wrestler"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
