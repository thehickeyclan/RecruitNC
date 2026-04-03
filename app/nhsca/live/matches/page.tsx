import { getSupabaseServerClient } from "@/lib/supabase/server"
import type { LiveMatch, NCWrestler, RankedWrestler } from "@/lib/nhsca-live/types"
import { LiveMatchManagement } from "@/components/nhsca-live/live-match-management"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

async function getMatchData() {
  const supabase = await getSupabaseServerClient()

  const { data: matches } = await supabase.from("live_matches").select("*").order("created_at", { ascending: false })

  const { data: roster } = await supabase.from("nc_roster").select("*").order("name", { ascending: true })

  const { data: rankedWrestlers } = await supabase
    .from("ranked_wrestlers")
    .select("*")
    .order("name", { ascending: true })

  return {
    matches: (matches as LiveMatch[]) || [],
    roster: (roster as NCWrestler[]) || [],
    rankedWrestlers: (rankedWrestlers as RankedWrestler[]) || [],
  }
}

export default async function MatchesPage() {
  const { matches, roster, rankedWrestlers } = await getMatchData()

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/nhsca/live">
            <Button variant="outline" size="icon" className="glass border-border bg-transparent">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-primary">Live Match Updates</h1>
            <p className="text-muted-foreground">Track and update live matches in real-time</p>
          </div>
        </div>

        <LiveMatchManagement initialMatches={matches} roster={roster} rankedWrestlers={rankedWrestlers} />
      </div>
    </div>
  )
}
