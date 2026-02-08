import { NextResponse } from "next/server"
import { getBlueContent } from "@/lib/blue-content"

export const dynamic = "force-dynamic"

export async function GET() {
  const content = await getBlueContent()
  return NextResponse.json(content)
}
