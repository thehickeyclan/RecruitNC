import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { hasPortalAccess, hasPremiumAccess } from "@/lib/ranking-visibility"
import { CommandCenter } from "./command-center"
import { commandCenterFont } from "./font"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Super 32 HQ",
  description: "Every North Carolina wrestler at Super 32 in one place: every result, every match, Huge and Big wins and the All-Americans.",
}

/**
 * Super 32 HQ is for Insider, Blue, the Command Center, verified college coaches and admins
 * (Matt, 26 Oct 2026). Free during the event; after it, everyone else gets the pitch and the free
 * recap, never the dashboard.
 */
export default async function Super32LivePage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const supabase = await createClient()
  const { viewer } = await resolveRankingViewer({ supabase, admin: createAdminClient() })
  // Admins can check what a non-member sees: ?preview=free.
  const previewFree = viewer.isAdmin === true && (await searchParams).preview === "free"
  if (previewFree || !(hasPremiumAccess(viewer) || hasPortalAccess(viewer))) return <HqLocked />
  return (
    <div className={commandCenterFont.variable}>
      <CommandCenter />
    </div>
  )
}

function HqLocked() {
  return (
    <main className="min-h-screen bg-[#0A1628] px-4 py-10 text-white">
      <div className="mx-auto max-w-xl rounded-2xl border border-[#d4af55]/60 bg-gradient-to-br from-[#13294b] to-[#0b1730] p-6">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#d4af55]">Insider</div>
        <h1 className="mt-1 text-3xl font-black leading-tight">Super 32 <span className="text-[#d4af55]">HQ</span></h1>
        <p className="mt-2 text-[15px] text-[#c9d4ea]">
          Every North Carolina result from Greensboro in one place: every match, every Huge and Big win, every opponent&apos;s credentials and the All-Americans.
          Super 32 HQ is part of Insider, NC United Blue and the Command Center, and free for college coaches.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href="/rankings" className="rounded-lg bg-[#d4af55] px-4 py-2.5 text-center text-sm font-bold text-[#0b1730]">Sign up for Insider →</Link>
          <Link href="/auth/signin?returnTo=%2Fsuper32%2Flive" className="rounded-lg bg-white px-4 py-2.5 text-center text-sm font-bold text-[#0b1730]">Sign in</Link>
          <Link href="/auth/signup?type=college-coach" className="rounded-lg border border-white/40 px-4 py-2.5 text-center text-sm font-semibold">College coach? Free access</Link>
        </div>
        <p className="mt-5 border-t border-white/10 pt-4 text-sm text-[#c9d4ea]">
          Free to read: <Link href="/news/super32-2026-nc-boys-recap" className="font-semibold text-[#d4af55] underline underline-offset-2">the Super 32 2026 North Carolina recap →</Link>
        </p>
      </div>
    </main>
  )
}
