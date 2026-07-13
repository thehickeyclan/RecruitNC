import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Trophy, TrendingUp, Medal } from "lucide-react"
import type { FargoTeamSummary } from "@/lib/fargo-archive"
import { NC_GOLD, NC_NAVY, NC_RED } from "@/lib/fargo-archive"

export function FargoTeamStatsGrid({
  sixteenU,
  junior,
}: {
  sixteenU?: FargoTeamSummary
  junior?: FargoTeamSummary
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sixteenU ? <FargoDivisionStatCard summary={sixteenU} accent={NC_GOLD} /> : null}
      {junior ? <FargoDivisionStatCard summary={junior} accent={NC_RED} /> : null}
    </div>
  )
}

function FargoDivisionStatCard({ summary, accent }: { summary: FargoTeamSummary; accent: string }) {
  const record = `${summary.wins}-${summary.losses}`
  return (
    <Card className="border-2 overflow-hidden" style={{ borderColor: `${accent}55` }}>
      <CardHeader className="pb-3" style={{ backgroundColor: NC_NAVY }}>
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Medal className="h-5 w-5" style={{ color: accent }} />
          {summary.division === "16U" ? "16U Boys" : "Junior Boys"}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 p-5">
        <Stat icon={Users} label="Wrestlers" value={String(summary.wrestlers)} />
        <Stat icon={TrendingUp} label="Team record" value={record} />
        <Stat icon={Trophy} label="Win rate" value={summary.winPct} />
        <Stat icon={Medal} label="All-Americans" value={String(summary.allAmericans)} highlight={summary.allAmericans > 0} />
        <div className="col-span-2 text-sm text-muted-foreground border-t pt-3">
          {summary.wrestlersWithWin} of {summary.wrestlers} wrestlers won at least one match ({summary.pctWithWin})
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Users
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={`mt-1 text-2xl font-bold ${highlight ? "text-[#B31B1B]" : "text-[#002147]"}`}>{value}</p>
    </div>
  )
}
