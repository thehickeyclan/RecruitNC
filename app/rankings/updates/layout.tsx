import { redirectIfSignedOut } from "@/lib/server-auth-redirect"

export const dynamic = "force-dynamic"

export default async function RankingsUpdatesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await redirectIfSignedOut("/rankings/updates")
  return <>{children}</>
}
