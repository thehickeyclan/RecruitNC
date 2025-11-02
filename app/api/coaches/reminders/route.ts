import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch upcoming reminders
    const { data: reminders, error } = await supabase
      .from("recruiting_notes")
      .select(
        `
        id,
        note,
        reminder_date,
        created_at,
        updated_at,
        athlete_id,
        athletes (
          id,
          name,
          firstName,
          lastName,
          graduationyear,
          weightclass,
          highschool,
          photourl
        )
      `,
      )
      .eq("coach_user_id", user.id)
      .not("reminder_date", "is", null)
      .gte("reminder_date", new Date().toISOString())
      .order("reminder_date", { ascending: true })
      .limit(50)

    if (error) {
      console.error("[v0] Error fetching reminders:", error)
      return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 })
    }

    const formattedReminders = reminders?.map((reminder: any) => ({
      id: reminder.id,
      note: reminder.note,
      reminder_date: reminder.reminder_date,
      created_at: reminder.created_at,
      updated_at: reminder.updated_at,
      athlete: {
        id: reminder.athletes.id,
        name: reminder.athletes.name || `${reminder.athletes.firstName} ${reminder.athletes.lastName}`,
        graduation_year: reminder.athletes.graduationyear,
        weightclass: reminder.athletes.weightclass,
        highschool: reminder.athletes.highschool,
        photourl: reminder.athletes.photourl,
      },
    }))

    return NextResponse.json({ reminders: formattedReminders || [] })
  } catch (error) {
    console.error("[v0] Unexpected error in reminders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
