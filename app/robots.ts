import type { MetadataRoute } from "next"

/**
 * NC United's robots.txt (app.ncwrestlingunited.com/robots.txt), which did not exist. Public pages
 * open to search; accounts, tools, staff and the API not. recruitwrestlers.com answers its own in the
 * middleware before this is reached.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/auth", "/dev", "/debug", "/my-recruiting", "/my-recruits", "/coach-home", "/coach-reports", "/inbox", "/profile", "/edit-profile", "/profile-setup", "/run-sheet"],
      },
    ],
    sitemap: "https://app.ncwrestlingunited.com/sitemap.xml",
  }
}
