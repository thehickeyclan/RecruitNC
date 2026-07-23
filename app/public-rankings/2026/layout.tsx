import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function PublicRankings2026Layout({
  children,
}: {
  children: React.ReactNode
}) {
  redirect("/public-rankings")
  return <>{children}</>
}
