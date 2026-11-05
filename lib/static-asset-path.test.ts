import { describe, expect, it } from "vitest"

import { isStaticAssetPath } from "@/lib/static-asset-path"

describe("isStaticAssetPath", () => {
  it("passes every file type we serve from /public", () => {
    for (const p of [
      "/deck/RecruitWrestlers-for-Families.pdf",
      "/documents/nchsaa-2026-27-handbook.pdf",
      "/deck/04c13b2cab18b77b1dc2043e5a806fc9.png",
      "/images/nc-united-logo-official.png",
      "/screens/rw/command-center.jpg",
      "/icon.svg",
      "/manifest.json",
      "/favicon.ico",
    ]) {
      expect(isStaticAssetPath(p), p).toBe(true)
    }
  })

  it("ignores case, because a file can be named .PDF", () => {
    expect(isStaticAssetPath("/documents/HANDBOOK.PDF")).toBe(true)
    expect(isStaticAssetPath("/images/Logo.PNG")).toBe(true)
  })

  it("leaves real pages to the brand gate", () => {
    for (const p of ["/admin/business", "/my-recruiting", "/athletes/123", "/", "/api/profile"]) {
      expect(isStaticAssetPath(p), p).toBe(false)
    }
  })

  it("wants the extension at the end, not anywhere in the path", () => {
    // The middleware passes request.nextUrl.pathname, which never carries the query string, so
    // "/admin/business?file=x.pdf" is not an input this can be given.
    expect(isStaticAssetPath("/pdf/something")).toBe(false)
    expect(isStaticAssetPath("/deck/pdf-notes")).toBe(false)
  })
})
