import type { Metadata } from "next"
import { TocBracketsHub } from "@/components/toc/brackets/toc-brackets-hub"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Brackets | Tournament of Champions 2026",
  description: "Official draws for the NC United Tournament of Champions — by weight class.",
}

export default function TocBracketsPage() {
  return <TocBracketsHub />
}
