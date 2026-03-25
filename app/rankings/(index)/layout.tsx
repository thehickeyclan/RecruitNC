import { redirectIfSignedOut } from "@/lib/server-auth-redirect"

export const dynamic = "force-dynamic"

export default async function RankingsIndexLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await redirectIfSignedOut("/rankings")
  return <>{children}</>
}
