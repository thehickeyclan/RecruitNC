"use client"

import type { LiveMatch } from "@/lib/nhsca-live/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Star } from "lucide-react"

interface LiveMatchesFeedProps {
  matches: LiveMatch[]
}

export function LiveMatchesFeed({ matches }: LiveMatchesFeedProps) {
  if (matches.length === 0) {
    return (
      <Card className="glass border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-muted-foreground" />
            Live Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No live matches at the moment</p>
            <p className="text-sm mt-2">Matches will appear here when they start</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent animate-pulse" />
          Live Matches
          <Badge variant="destructive" className="ml-auto animate-pulse">
            {matches.length} LIVE
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {matches.map((match) => (
          <div
            key={match.id}
            className="glass-strong rounded-lg p-4 space-y-3 glow-red animate-in fade-in duration-500"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-primary text-primary">
                  {match.weight_class} lbs
                </Badge>
                {match.round && <Badge variant="secondary">{match.round}</Badge>}
                {match.is_notable && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-primary fill-primary" />
                    <span className="text-xs text-primary">Notable</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 items-center gap-4">
              <div className="text-right">
                <p className="font-bold text-lg text-primary">{match.nc_wrestler_name}</p>
                <p className="text-xs text-muted-foreground">NC United</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-bold text-primary">{match.nc_score}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-2xl font-bold">{match.opponent_score}</span>
                </div>
              </div>

              <div className="text-left">
                <p className="font-bold text-lg">{match.opponent_name}</p>
                {match.is_notable && <p className="text-xs text-primary">Ranked Opponent</p>}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
