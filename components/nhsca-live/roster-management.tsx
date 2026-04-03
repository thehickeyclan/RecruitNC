"use client"

import { useState } from "react"
import type { NCWrestler } from "@/lib/nhsca-live/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { AddWrestlerDialog } from "@/components/nhsca-live/add-wrestler-dialog"
import { EditWrestlerDialog } from "@/components/nhsca-live/edit-wrestler-dialog"
import { Badge } from "@/components/ui/badge"
import { deleteWrestler } from "@/app/nhsca/live/actions/roster-actions"
import { useRouter } from "next/navigation"

interface RosterManagementProps {
  initialRoster: NCWrestler[]
}

export function RosterManagement({ initialRoster }: RosterManagementProps) {
  const [roster, setRoster] = useState(initialRoster)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedWrestler, setSelectedWrestler] = useState<NCWrestler | null>(null)
  const router = useRouter()

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this wrestler?")) return

    const result = await deleteWrestler(id)
    if (result.success) {
      setRoster(roster.filter((w) => w.id !== id))
      router.refresh()
    }
  }

  const handleEdit = (wrestler: NCWrestler) => {
    setSelectedWrestler(wrestler)
    setEditDialogOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "champion":
        return "bg-primary text-primary-foreground"
      case "placed":
        return "bg-success text-white"
      case "active":
        return "bg-secondary text-secondary-foreground"
      case "eliminated":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <>
      <Card className="glass border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>NC United Roster ({roster.length})</CardTitle>
            <Button onClick={() => setAddDialogOpen(true)} className="bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Add Wrestler
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {roster.map((wrestler) => (
              <div key={wrestler.id} className="glass-strong rounded-lg p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{wrestler.name}</h3>
                    <Badge variant="outline" className="border-primary text-primary">
                      {wrestler.weight_class} lbs
                    </Badge>
                    {wrestler.seed && (
                      <Badge variant="secondary" className="text-xs">
                        Seed #{wrestler.seed}
                      </Badge>
                    )}
                    <Badge className={`${getStatusColor(wrestler.bracket_status)} text-xs`}>
                      {wrestler.bracket_status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      Record: {wrestler.wins}W - {wrestler.losses}L
                    </span>
                    {wrestler.notable_wins && wrestler.notable_wins.length > 0 && (
                      <span className="text-primary">Notable Wins: {wrestler.notable_wins.length}</span>
                    )}
                    {wrestler.placement && <span>Placement: #{wrestler.placement}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(wrestler)} className="border-border">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(wrestler.id)}
                    className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AddWrestlerDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      {selectedWrestler && (
        <EditWrestlerDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} wrestler={selectedWrestler} />
      )}
    </>
  )
}
