import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "NHSCA High School Nationals | NC United Wrestling",
  description: "Real-time tournament dashboard for North Carolina wrestlers at NHSCA High School Nationals. Track Freshman, Sophomore, Junior, and Senior divisions.",
  openGraph: {
    title: "NHSCA High School Nationals | NC United Wrestling",
    description: "Real-time tournament dashboard for NC wrestlers at High School Nationals",
  },
}

export default function NHSCALayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
