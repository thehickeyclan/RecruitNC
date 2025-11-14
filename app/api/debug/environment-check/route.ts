export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // Extract project ID from URL
    let projectId = null
    if (supabaseUrl) {
      const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
      if (match) {
        projectId = match[1]
      }
    }

    return Response.json({
      success: true,
      supabase_url: supabaseUrl,
      project_id: projectId,
      has_anon_key: !!anonKey,
      has_service_key: !!serviceKey,
      anon_key_length: anonKey?.length,
      service_key_length: serviceKey?.length,
      environment_details: {
        node_env: process.env.NODE_ENV,
        vercel_env: process.env.VERCEL_ENV,
        has_env_local: process.env.NODE_ENV === "development",
      },
    })
  } catch (error) {
    return Response.json({
      success: false,
      error: "Failed to check environment",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
