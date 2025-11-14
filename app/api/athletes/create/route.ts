export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("[v0] Received athlete data:", body)

    // Only use required fields from database schema
    const athleteData = {
      name: `${body.firstName || ""} ${body.lastName || ""}`.trim() || "Unknown",
      firstName: body.firstName || null,
      lastName: body.lastName || null,
      is_prospect: body.isProspect !== false, // Default to true
      recruiting_status: body.isProspect !== false ? "Uncommitted" : "Committed",
    }

    console.log("[v0] Inserting minimal athlete data:", athleteData)

    const { createServerClient } = await import("@supabase/ssr")
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get: () => null,
        set: () => {},
        remove: () => {},
      },
    })

    const { data, error } = await supabase.from("athletes").insert([athleteData]).select()

    if (error) {
      console.error("[v0] Database error:", error)
      return Response.json({ error: error.message }, { status: 400 })
    }

    console.log("[v0] Successfully created athlete:", data)
    return Response.json({ success: true, athlete: data[0] })
  } catch (error) {
    console.error("[v0] API error:", error)
    return Response.json({ error: "Failed to create athlete" }, { status: 500 })
  }
}
