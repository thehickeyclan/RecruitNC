import { redirectIfSignedOut } from "@/lib/server-auth-redirect"

export const dynamic = "force-dynamic"

export default async function PublicRankings2027Layout({
  children,
}: {
  children: React.ReactNode
}) {
  await redirectIfSignedOut("/public-rankings/2027")
  return <>{children}</>
}
