import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "NC United Blue | NC Wrestling United",
  description:
    "Creating Opportunity. Setting the Standard. Representing North Carolina. NC United Blue is the flagship development program for elite high school wrestlers.",
}

export default function BlueLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
