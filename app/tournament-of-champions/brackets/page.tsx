import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { TocBracketsHub } from "@/components/toc/brackets/toc-brackets-hub"
import { requireTocBracketViewer } from "@/lib/toc/require-toc-bracket-viewer"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Brackets | Tournament of Champions 2026",
  description: "Official draws for the NC United Tournament of Champions — by weight class.",
  robots: { index: false, follow: false },
}

export default async function TocBracketsPage() {
  const gate = await requireTocBracketViewer()
  if (!gate.ok) {
    if (gate.status === 401) {
      redirect(`/auth/signin?returnTo=${encodeURIComponent("/tournament-of-champions/brackets")}`)
    }
    redirect("/tournament-of-champions")
  }

  return <TocBracketsHub />
}
