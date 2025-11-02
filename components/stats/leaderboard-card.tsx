import { Card, CardContent } from "@/components/ui/card"
import { EntityLogo } from "@/components/entity-logo"

interface LeaderboardCardProps {
  rank: number
  name: string
  entityType: "college" | "highSchool" | "wrestlingClub"
  commitmentCount: number
}

export function LeaderboardCard({ rank, name, entityType, commitmentCount }: LeaderboardCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className={`h-1 ${getRankColor(rank)}`} />
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-bold">
            {rank}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium">{name}</h3>
            <p className="text-xs text-muted-foreground">{commitmentCount} commitments</p>
          </div>
          <div className="h-10 w-10 shrink-0">
            <EntityLogo entityType={entityType} entityName={name} className="h-10 w-10 rounded-full object-cover" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getRankColor(rank: number): string {
  switch (rank) {
    case 1:
      return "bg-yellow-500" // Gold
    case 2:
      return "bg-gray-300" // Silver
    case 3:
      return "bg-amber-700" // Bronze
    default:
      return "bg-blue-600" // Blue for others
  }
}
