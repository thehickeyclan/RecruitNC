import type { Metadata } from "next"
import { TocLayoutShell } from "@/components/toc/toc-theme"
import { TOC_EVENT_LOGO } from "@/lib/toc/constants"

const base = process.env.NEXT_PUBLIC_APP_URL || "https://app.ncwrestlingunited.com"

/** Shared link-preview image for all TOC routes (iMessage, GroupMe, etc.). */
export const metadata: Metadata = {
  metadataBase: new URL(base),
  openGraph: {
    siteName: "NC United / RecruitNC",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: TOC_EVENT_LOGO.src,
        width: TOC_EVENT_LOGO.width,
        height: TOC_EVENT_LOGO.height,
        alt: TOC_EVENT_LOGO.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [TOC_EVENT_LOGO.src],
  },
}

export default function TournamentOfChampionsLayout({ children }: { children: React.ReactNode }) {
  return <TocLayoutShell>{children}</TocLayoutShell>
}
