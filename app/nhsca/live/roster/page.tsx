import { getSupabaseServerClient } from "@/lib/supabase/server"
import type { NCWrestler } from "@/lib/nhsca-live/types"
import { RosterManagement } from "@/components/nhsca-live/roster-management"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

async function getRoster() {
  const supabase = await getSupabaseServerClient()
  const { data: roster } = await supabase.from("nc_roster").select("*").order("weight_class", { ascending: true })
  return (roster as NCWrestler[]) || []
}

export default async function RosterPage() {
  const roster = await getRoster()

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
            <h1 className="text-3xl font-bold text-primary">Roster Management</h1>
            <p className="text-muted-foreground">Add, edit, and manage NC United wrestlers</p>
          </div>
        </div>

        <RosterManagement initialRoster={roster} />
      </div>
    </div>
  )
}
