import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://www.recruitnc.com").replace(/\/$/, "")
  const now = new Date()
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/clubs`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/spartan`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
  ]
}
