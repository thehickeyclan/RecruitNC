import { redirect } from "next/navigation"

/**
 * The link we give college coaches. Sign-up is one wizard now; this opens it on the coach step.
 */
export default async function CoachSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { returnTo } = await searchParams
  const params = new URLSearchParams({ type: "college-coach" })
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) params.set("returnTo", returnTo)
  redirect(`/auth/signup?${params.toString()}`)
}
