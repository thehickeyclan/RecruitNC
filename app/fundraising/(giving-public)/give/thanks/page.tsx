import { redirect } from "next/navigation"

/** Legacy Stripe success URL — forwards query string (e.g. session_id) to Training Fund thanks. */
export default async function FundraisingGiveThanksRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = (await searchParams) ?? {}
  const q = new URLSearchParams()
  for (const [key, val] of Object.entries(sp)) {
    if (val === undefined) continue
    if (Array.isArray(val)) val.forEach((v) => q.append(key, v))
    else q.append(key, val)
  }
  const qs = q.toString()
  redirect(`/fundraising/training-fund/thanks${qs ? `?${qs}` : ""}`)
}
