import { NextResponse } from "next/server"
import { getBlueContent } from "@/lib/blue-content"

export const dynamic = "force-dynamic"

export async function GET() {
  const content = await getBlueContent()
  const res = NextResponse.json(content)
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
  return res
}
