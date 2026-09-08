import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/** The same two shapes `/api/push/register` accepts; anything else is not a deliverable target. */
const EXPO_TOKEN = /^Expo(nent)?PushToken\[[^\]]+\]$/
const UUID = /^[0-9a-f-]{36}$/i

/**
 * Following a college team.
 *
 * Device-scoped, like push registration, because the app has no accounts and a follow should not
 * be the thing that suddenly demands a sign-up. The Expo token is the identity, and it never
 * leaves the request — the caller sends the token, the server resolves it to a device row.
 *
 * Service-role rather than letting the app write with the anon key, so `college_follows` needs no
 * publicly writable policy: with one, anybody could subscribe somebody else's device to anything.
 */

type FollowBody = {
  expoPushToken?: string
  collegeId?: string
  /** Absent means follow; false unfollows. */
  following?: boolean
}

async function deviceIdFor(admin: ReturnType<typeof createAdminClient>, token: string): Promise<string | null> {
  const { data } = await admin.from("push_devices").select("id").eq("expo_push_token", token).maybeSingle()
  return (data as { id?: string } | null)?.id ?? null
}

/** The teams this device follows. */
export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("expoPushToken")?.trim()
    if (!token || !EXPO_TOKEN.test(token)) {
      return NextResponse.json({ error: "A valid Expo push token is required." }, { status: 400 })
    }

    const admin = createAdminClient()
    const deviceId = await deviceIdFor(admin, token)
    // An unregistered device follows nothing. Not an error: the app asks before it registers.
    if (!deviceId) return NextResponse.json({ following: [] })

    const { data, error } = await admin
      .from("college_follows")
      .select("college_id, colleges(name, division, logo_url)")
      .eq("device_id", deviceId)
    if (error) {
      console.error("[college-follows] GET", error.message)
      return NextResponse.json({ error: "Could not read follows." }, { status: 500 })
    }

    return NextResponse.json({
      following: (data ?? []).map((row) => {
        const college = (row as { colleges?: unknown }).colleges as
          | { name?: string; division?: string; logo_url?: string }
          | null
        return {
          collegeId: (row as { college_id: string }).college_id,
          name: college?.name ?? null,
          division: college?.division ?? null,
          logoUrl: college?.logo_url ?? null,
        }
      }),
    })
  } catch (error) {
    console.error("[college-follows] GET unexpected", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/** Follow or unfollow one team. */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as FollowBody | null
    const token = body?.expoPushToken?.trim()
    const collegeId = body?.collegeId?.trim()

    if (!token || !EXPO_TOKEN.test(token)) {
      return NextResponse.json({ error: "A valid Expo push token is required." }, { status: 400 })
    }
    if (!collegeId || !UUID.test(collegeId)) {
      return NextResponse.json({ error: "A valid college id is required." }, { status: 400 })
    }

    const admin = createAdminClient()
    const deviceId = await deviceIdFor(admin, token)
    if (!deviceId) {
      // Registration comes first, and the app does it on launch. Saying so beats a silent no-op
      // that leaves somebody tapping Follow and wondering why nothing happens.
      return NextResponse.json({ error: "This device is not registered for alerts yet." }, { status: 409 })
    }

    if (body?.following === false) {
      const { error } = await admin
        .from("college_follows")
        .delete()
        .eq("device_id", deviceId)
        .eq("college_id", collegeId)
      if (error) {
        console.error("[college-follows] unfollow", error.message)
        return NextResponse.json({ error: "Could not unfollow." }, { status: 500 })
      }
      return NextResponse.json({ following: false, collegeId })
    }

    // Idempotent: following twice is a double tap, not an error.
    const { error } = await admin
      .from("college_follows")
      .upsert({ device_id: deviceId, college_id: collegeId }, { onConflict: "device_id,college_id" })
    if (error) {
      console.error("[college-follows] follow", error.message)
      return NextResponse.json({ error: "Could not follow that team." }, { status: 500 })
    }

    return NextResponse.json({ following: true, collegeId })
  } catch (error) {
    console.error("[college-follows] POST unexpected", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
