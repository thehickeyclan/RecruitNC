import { getSupabaseServerClient } from "@/lib/supabase/server"
import type { RankedWrestler } from "@/lib/nhsca-live/types"
import { RankedWrestlerManagement } from "@/components/nhsca-live/ranked-wrestler-management"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

async function getRankedWrestlers() {
  const supabase = await getSupabaseServerClient()
  const { data: rankedWrestlers } = await supabase
    .from("ranked_wrestlers")
    .select("*")
    .order("ranking", { ascending: true })
  return (rankedWrestlers as RankedWrestler[]) || []
}

export default async function RankedWrestlersPage() {
  const rankedWrestlers = await getRankedWrestlers()

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
            <h1 className="text-3xl font-bold text-primary">Ranked Wrestler Index</h1>
            <p className="text-muted-foreground">Track ranked opponents for notable win identification</p>
          </div>
        </div>

        <RankedWrestlerManagement initialRankedWrestlers={rankedWrestlers} />
      </div>
    </div>
  )
}
