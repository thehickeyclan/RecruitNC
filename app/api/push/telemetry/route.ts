import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const EVENTS = new Set([
  "app_launch",
  "permission_granted",
  "permission_denied",
  "device_registered",
  "registration_failed",
  "alerts_enabled",
  "alerts_disabled",
  "prefs_updated",
])

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const installationId = typeof body?.installationId === "string" ? body.installationId.trim() : ""
  const eventType = typeof body?.eventType === "string" ? body.eventType : ""
  if (!installationId || installationId.length > 100 || !EVENTS.has(eventType)) {
    return NextResponse.json({ error: "Invalid telemetry event" }, { status: 400 })
  }

  const safeMetadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : {}
  const { error } = await createAdminClient().from("push_install_events").insert({
    installation_id: installationId,
    event_type: eventType,
    platform: typeof body.platform === "string" ? body.platform.slice(0, 20) : null,
    permission_status: typeof body.permissionStatus === "string" ? body.permissionStatus.slice(0, 40) : null,
    alerts_enabled: typeof body.alertsEnabled === "boolean" ? body.alertsEnabled : null,
    app_version: typeof body.appVersion === "string" ? body.appVersion.slice(0, 40) : null,
    build_number: typeof body.buildNumber === "string" ? body.buildNumber.slice(0, 40) : null,
    metadata: safeMetadata,
  })
  if (error) return NextResponse.json({ error: "Could not record telemetry" }, { status: 500 })
  return NextResponse.json({ ok: true })
}

