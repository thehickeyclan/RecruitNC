import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, GraduationCap, Users } from "lucide-react"

interface StatsCardsProps {
  totalCommitments: number
  classOf2025: number
  classOf2026: number
  maleCount: number
  femaleCount: number
}

export function StatsCards({
  totalCommitments = 0,
  classOf2025 = 0,
  classOf2026 = 0,
  maleCount = 0,
  femaleCount = 0,
}: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Commitments</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCommitments}</div>
          <p className="text-xs text-muted-foreground">NC wrestlers committed to colleges</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Class of 2025</CardTitle>
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{classOf2025}</div>
          <p className="text-xs text-muted-foreground">Current year commitments</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Class of 2026</CardTitle>
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{classOf2026}</div>
          <p className="text-xs text-muted-foreground">Next year commitments</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gender Breakdown</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
            <div>
              <div className="text-xl font-bold">{maleCount}</div>
              <p className="text-xs text-muted-foreground">Men</p>
            </div>
            <div>
              <div className="text-xl font-bold">{femaleCount}</div>
              <p className="text-xs text-muted-foreground">Women</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
