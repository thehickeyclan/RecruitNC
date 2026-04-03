import type { DashboardStats } from "@/lib/nhsca-live/types"
import { Users, Trophy, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StatsCardsProps {
  stats: DashboardStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Active Wrestlers",
      value: stats.activeWrestlers,
      subtitle: `of ${stats.totalWrestlers} competing`,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Winning Records",
      value: stats.winningRecords || 0,
      subtitle: "wrestlers above .500",
      icon: TrendingUp,
      color: "text-success",
    },
    {
      title: "Total Wins",
      value: stats.totalWins,
      subtitle: `${stats.totalLosses} losses`,
      icon: Trophy,
      color: "text-success",
    },

  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title} className="glass border-border">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold">{card.value}</p>
                  </div>
                  {card.subtitle && <p className="text-xs text-muted-foreground">{card.subtitle}</p>}
                </div>
                <div className={`p-3 rounded-lg bg-muted ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
