import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Safe, additive: extends existing handler to accept first/last/cell/profileType
export async function POST(request: NextRequest) {
  console.log("[v0] Signup API route called")

  try {
    console.log("[v0] Parsing request body...")
    const body = await request.json()
    console.log("[v0] Request body parsed:", {
      hasEmail: !!body.email,
      hasPassword: !!body.password,
      hasFirstName: !!body.firstName,
      hasLastName: !!body.lastName,
      profileType: body.profileType,
    })

    const { firstName, lastName, cellPhone, profileType, fullName, email, password, returnTo } = body as {
      firstName?: string
      lastName?: string
      cellPhone?: string
      profileType?: string
      fullName?: string
      email: string
      password: string
      returnTo?: string
    }

    const finalFullName =
      (typeof fullName === "string" && fullName.trim()) || 
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      email?.split("@")[0] || // Fallback to email username if no name provided
      "User"

    if (!email || !password) {
      console.log("[v0] Validation failed:", { email: !!email, password: !!password })
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 })
    }

    const roleNeedsPhone = profileType === "athlete" || profileType === "parent"
    if (roleNeedsPhone) {
      const digits = (cellPhone ?? "").replace(/\D/g, "")
      if (digits.length < 10) {
        return NextResponse.json(
          {
            error:
              "Cell phone is required for athlete and parent accounts (enter at least 10 digits, country code optional).",
          },
          { status: 400 },
        )
      }
    }

    console.log("[v0] Creating Supabase client...")
    const supabase = await createClient()
    console.log("[v0] Supabase client created")

    const safeReturnTo =
      typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : undefined
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    const emailRedirectTo = safeReturnTo
      ? `${baseUrl}/auth/callback?next=${encodeURIComponent(safeReturnTo)}`
      : `${baseUrl}/auth/callback`

    console.log("[v0] Calling Supabase signUp with emailRedirectTo:", emailRedirectTo)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: finalFullName,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          cell_phone: cellPhone || undefined,
          profile_type: profileType || undefined,
        },
      },
    })

    if (error) {
      console.error("[v0] Supabase signup error:", error)

      if (error.message.includes("already registered")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please try signing in instead." },
          { status: 400 },
        )
      }
      if (error.message.includes("Password should be")) {
        return NextResponse.json({ error: "Password should be at least 6 characters long" }, { status: 400 })
      }
      if (error.message.includes("Invalid email")) {
        return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 })
      }
      return NextResponse.json({ error: error.message || "Failed to create account" }, { status: 400 })
    }

    if (!data.user) {
      console.log("[v0] No user returned from Supabase")
      return NextResponse.json({ error: "Failed to create account" }, { status: 400 })
    }

    console.log("[v0] User created successfully:", data.user.id)

    try {
      console.log("[v0] Creating user profile...")
      const adminSupabase = createAdminClient()
      const profilePayload: Record<string, any> = {
        user_id: data.user.id,
        email: data.user.email,
        full_name: finalFullName,
        is_admin: false,
        created_at: new Date().toISOString(),
      }
      if (firstName) profilePayload.first_name = firstName
      if (lastName) profilePayload.last_name = lastName
      if (cellPhone) profilePayload.cell_phone = cellPhone
      if (profileType) profilePayload.role = profileType

      const { error: profileError } = await adminSupabase
        .from("user_profiles")
        .upsert(profilePayload, { onConflict: "user_id" })

      if (profileError) console.error("[v0] Profile upsert error (non-blocking):", profileError)
      else console.log("[v0] Profile created successfully")
    } catch (err) {
      console.error("[v0] Profile creation failed (non-blocking):", err)
    }

    console.log("[v0] Signup completed successfully")
    return NextResponse.json({
      success: true,
      message: "Account created successfully! Please check your email to verify your account.",
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: finalFullName,
        first_name: firstName || null,
        last_name: lastName || null,
        cell_phone: cellPhone || null,
        profile_type: profileType || null,
      },
    })
  } catch (error) {
    console.error("[v0] Sign up error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
