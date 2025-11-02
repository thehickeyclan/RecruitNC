"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, TrendingUp, Award } from 'lucide-react'

interface StatsOverviewProps {
  stats: {
    totalCommitments: number
    divisions: Record<string, number>
    recentCommitments: any[]
  }
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  // Ensure stats has safe defaults
  const safeStats = {
    totalCommitments: stats?.totalCommitments || 0,
    divisions: stats?.divisions || {},
    recentCommitments: Array.isArray(stats?.recentCommitments) ? stats.recentCommitments : []
  }

  const divisionEntries = Object.entries(safeStats.divisions).filter(([_, count]) => count > 0)

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Commitments</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.totalCommitments}</div>
          <p className="text-xs text-muted-foreground">NC wrestlers committed</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Division</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {divisionEntries.length > 0 
              ? divisionEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0] 
              : "N/A"
            }
          </div>
          <p className="text-xs text-muted-foreground">Most popular division</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.recentCommitments.length}</div>
          <p className="text-xs text-muted-foreground">New commitments this month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Division Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {divisionEntries.length > 0 ? (
              divisionEntries.slice(0, 3).map(([division, count]) => (
                <div key={division} className="flex justify-between items-center">
                  <span className="text-sm">{division}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
