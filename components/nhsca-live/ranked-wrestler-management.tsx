"use client"

import { useState } from "react"
import type { RankedWrestler } from "@/lib/nhsca-live/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Star, Search } from "lucide-react"
import { AddRankedWrestlerDialog } from "@/components/nhsca-live/add-ranked-wrestler-dialog"
import { EditRankedWrestlerDialog } from "@/components/nhsca-live/edit-ranked-wrestler-dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { deleteRankedWrestler } from "@/app/nhsca/live/actions/ranked-actions"
import { useRouter } from "next/navigation"

interface RankedWrestlerManagementProps {
  initialRankedWrestlers: RankedWrestler[]
}

export function RankedWrestlerManagement({ initialRankedWrestlers }: RankedWrestlerManagementProps) {
  const [rankedWrestlers, setRankedWrestlers] = useState(initialRankedWrestlers)
  const [searchQuery, setSearchQuery] = useState("")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedWrestler, setSelectedWrestler] = useState<RankedWrestler | null>(null)
  const router = useRouter()

  const filteredWrestlers = rankedWrestlers.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.team?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.state?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ranked wrestler?")) return

    const result = await deleteRankedWrestler(id)
    if (result.success) {
      setRankedWrestlers(rankedWrestlers.filter((w) => w.id !== id))
      router.refresh()
    }
  }

  const handleEdit = (wrestler: RankedWrestler) => {
    setSelectedWrestler(wrestler)
    setEditDialogOpen(true)
  }

  return (
    <>
      <Card className="glass border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary fill-primary" />
              Ranked Wrestlers ({filteredWrestlers.length})
            </CardTitle>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search wrestlers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="glass border-border pl-9 w-full sm:w-64"
                />
              </div>
              <Button onClick={() => setAddDialogOpen(true)} className="bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredWrestlers.map((wrestler) => (
              <div key={wrestler.id} className="glass-strong rounded-lg p-4 flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 border-2 border-primary flex-shrink-0">
                  <span className="text-lg font-bold text-primary">#{wrestler.ranking}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-bold text-lg">{wrestler.name}</h3>
                    <Badge variant="outline" className="border-primary text-primary">
                      {wrestler.weight_class} lbs
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                    {wrestler.team && <span>{wrestler.team}</span>}
                    {wrestler.state && (
                      <Badge variant="secondary" className="text-xs">
                        {wrestler.state}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
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

            {filteredWrestlers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No ranked wrestlers found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AddRankedWrestlerDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      {selectedWrestler && (
        <EditRankedWrestlerDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} wrestler={selectedWrestler} />
      )}
    </>
  )
}
