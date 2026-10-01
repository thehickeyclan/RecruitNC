import { NextResponse } from "next/server"
import { adminGate } from "@/lib/admin-gate"
import { del } from "@vercel/blob"

export async function DELETE(request: Request) {
  const denied = await adminGate()
  if (denied) return denied

  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
    }

    await del(url)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting blob:", error)
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 })
  }
}
