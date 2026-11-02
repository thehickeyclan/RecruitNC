/**
 * Recruiting needs: the weights and class years this staff is recruiting, posted in a few taps,
 * each with the wrestlers who fit it (lib/recruiting/needs.ts).
 *
 * ?as=<coach user id>: an admin sees that coach's needs, read-only, like My Recruits.
 */
import { AuthGuard } from "@/components/auth-guard"
import { NeedsBoard } from "@/components/coach/needs-board"

export const dynamic = "force-dynamic"
export const metadata = { title: "Recruiting Needs" }

export default async function NeedsPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const as = (await searchParams).as?.trim() || null
  return (
    <AuthGuard>
      <NeedsBoard asUserId={as} />
    </AuthGuard>
  )
}
