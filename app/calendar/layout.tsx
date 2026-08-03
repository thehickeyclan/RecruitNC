import type { Metadata } from "next"
import type { ReactNode } from "react"

const calendarTitle = "NC United Calendar"
const calendarDescription =
  "Follow the NC United calendar for practices, drop-ins, tournaments, events, and important wrestling dates across North Carolina."
const calendarUrl = "https://app.ncwrestlingunited.com/calendar"
const calendarShareImage = "/images/nc-united-logo-official.png"

export const metadata: Metadata = {
  title: calendarTitle,
  description: calendarDescription,
  alternates: {
    canonical: calendarUrl,
  },
  openGraph: {
    title: calendarTitle,
    description: calendarDescription,
    url: calendarUrl,
    siteName: "NC United Wrestling",
    type: "website",
    images: [
      {
        url: calendarShareImage,
        width: 512,
        height: 512,
        alt: "NC United Wrestling logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: calendarTitle,
    description: calendarDescription,
    images: [calendarShareImage],
  },
}

export default function CalendarLayout({ children }: { children: ReactNode }) {
  return children
}
