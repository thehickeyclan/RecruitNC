import { NextResponse } from "next/server"

/**
 * Temporary: check if Supabase env vars are present in this deployment.
 * DELETE this file once profiles are working.
 * GET /api/debug-supabase-env
 */
export async function GET() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const keyOverride = process.env.SUPABASE_SERVICE_ROLE_KEY_OVERRIDE
  const keyIntegration = process.env.SUPABASE_SERVICE_ROLE_KEY

  return NextResponse.json({
    url: url ? "set" : "missing",
    serviceRoleKeyOverride: keyOverride ? "set" : "not set",
    serviceRoleKeyIntegration: keyIntegration ? "set" : "not set",
    willUse: keyOverride ? "OVERRIDE" : keyIntegration ? "integration" : "none",
  })
}
