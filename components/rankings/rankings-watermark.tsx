import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Whose copy this is, printed on the board.
 *
 * A ranking is the whole product in one screenshot, which makes it the easiest thing on the
 * site to give away. Watermarking is the cheapest control that actually changes behaviour:
 * it costs a paying member nothing, and somebody whose own name is on the page thinks twice
 * before posting it. The scouting report has carried this for a while, for the same reason and
 * in the same words.
 *
 * The line is deliberately not a threat. Sharing one wrestler's placing is the best marketing
 * this has - a parent posting "my son is fourth in North Carolina" sells subscriptions - so the
 * ask is narrow and states which half is welcome. A rule people agree with is followed; a
 * blanket prohibition gets ignored and resented.
 */
export async function RankingsWatermark({ userId }: { userId: string | null }) {
  if (!userId) return null

  const { data } = await createAdminClient()
    .from("user_profiles")
    .select("full_name, email")
    .eq("user_id", userId)
    .maybeSingle()

  const name = String(data?.full_name ?? "").trim()
  const email = String(data?.email ?? "").trim()
  const who = name && email ? `${name} · ${email}` : name || email
  if (!who) return null

  return (
    <div className="mx-auto mt-10 max-w-2xl border-t border-white/10 pt-5 text-center">
      <p className="text-[11px] leading-relaxed text-white/30">Prepared for {who}</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
        Share your own wrestler&apos;s ranking anywhere you like &mdash; we&apos;d love you to.
        Please don&apos;t repost the full board or screenshots of it; subscriptions are what keep
        these rankings going.
      </p>
    </div>
  )
}
