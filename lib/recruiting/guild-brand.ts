import type { Metadata } from "next"

/** Guild Recruiting's brand values, shared by server pages and the browser frame (components/recruiting/guild-frame.tsx). */
export const GUILD_GOLD = "#B89D60"


/**
 * Replaces every field the site-wide metadata sets (app/layout.tsx), so a Guild page never
 * previews as NC United. Not indexed while the address is staged.
 */
export function guildMetadata(title: string, description = "College wrestling recruiting, built on verified results."): Metadata {
  return {
    metadataBase: new URL("https://recruit.wrestlingguild.com"),
    title: { absolute: title },
    description,
    applicationName: "Guild Recruiting",
    manifest: null,
    robots: { index: false, follow: false },
    openGraph: { title, description, siteName: "Guild Recruiting", type: "website", images: [{ url: "/guild/guild-mark-512.png", width: 512, height: 512, alt: "Guild Recruiting" }] },
    twitter: { card: "summary", title, description, images: ["/guild/guild-mark-512.png"] },
    appleWebApp: { capable: true, statusBarStyle: "black", title: "Guild Recruiting" },
    icons: { icon: [{ url: "/guild/guild-mark.png", type: "image/png" }], apple: [{ url: "/guild/guild-mark.png" }] },
  }
}
