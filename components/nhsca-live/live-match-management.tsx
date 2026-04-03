"use client"

import { useState } from "react"
import type { LiveMatch, NCWrestler, RankedWrestler } from "@/lib/nhsca-live/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Activity } from "lucide-react"
import { AddMatchDialog } from "@/components/nhsca-live/add-match-dialog"
import { MatchCard } from "@/components/nhsca-live/match-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface LiveMatchManagementProps {
  initialMatches: LiveMatch[]
  roster: NCWrestler[]
  rankedWrestlers: RankedWrestler[]
}

export function LiveMatchManagement({ initialMatches, roster, rankedWrestlers }: LiveMatchManagementProps) {
  const [matches, setMatches] = useState(initialMatches)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const liveMatches = matches.filter((m) => m.status === "live")
  const completedMatches = matches.filter((m) => m.status === "completed")

  const handleMatchUpdate = (updatedMatch: LiveMatch) => {
    setMatches(matches.map((m) => (m.id === updatedMatch.id ? updatedMatch : m)))
  }

  const handleMatchDelete = (matchId: string) => {
    setMatches(matches.filter((m) => m.id !== matchId))
  }

  return (
    <>
      <Card className="glass border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent" />
              Match Management
            </CardTitle>
            <Button onClick={() => setAddDialogOpen(true)} className="bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Add Match
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="live" className="w-full">
            <TabsList className="grid w-full grid-cols-2 glass">
              <TabsTrigger value="live">Live ({liveMatches.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedMatches.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="space-y-4 mt-4">
              {liveMatches.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No live matches at the moment</p>
                </div>
              ) : (
                liveMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    roster={roster}
                    rankedWrestlers={rankedWrestlers}
                    onUpdate={handleMatchUpdate}
                    onDelete={handleMatchDelete}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 mt-4">
              {completedMatches.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No completed matches yet</p>
                </div>
              ) : (
                completedMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    roster={roster}
                    rankedWrestlers={rankedWrestlers}
                    onUpdate={handleMatchUpdate}
                    onDelete={handleMatchDelete}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AddMatchDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        roster={roster}
        rankedWrestlers={rankedWrestlers}
      />
    </>
  )
}
