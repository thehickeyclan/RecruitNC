import type { Metadata } from "next"
import { shareMetadata } from "@/lib/share-metadata"

export const metadata = shareMetadata({
  title: "NC United Blue",
  description: "The flagship development program for elite North Carolina high school wrestlers.",
  path: "/blue",
  kicker: "NC United Blue",
  pageTitle: "NC United Blue | NC Wrestling United",
})

export default function BlueLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
