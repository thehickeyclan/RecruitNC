import type { Metadata } from "next"
import { TocBracketsHub } from "@/components/toc/brackets/toc-brackets-hub"

/**
 * The seeding room, now under /admin where it belongs.
 *
 * It used to live at /tournament-of-champions/brackets, which is the address people share. That
 * page showed staff the tool — simulate, reseed, relock — and everyone else a sign-in wall, on a
 * tournament that has been wrestled. Those public addresses now go to the results bracket.
 */
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Bracket seeding | Admin",
  robots: { index: false, follow: false },
}

export default function AdminTocBracketsPage() {
  return <TocBracketsHub />
}
