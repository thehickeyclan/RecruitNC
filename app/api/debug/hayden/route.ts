import { NextResponse } from "next/server"
import { getHaydenData } from "@/lib/athlete-service"

export async function GET() {
  try {
    const data = await getHaydenData()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in Hayden debug API:", error)
    return NextResponse.json({ error: "Failed to fetch Hayden's data" }, { status: 500 })
  }
}
