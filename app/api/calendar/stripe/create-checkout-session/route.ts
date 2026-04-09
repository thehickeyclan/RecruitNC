import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getDropInFeeCents, getNcUnitedCalendarBaseUrl, getNcUnitedStripe } from "@/lib/nc-united-calendar/stripe"

const REQUIRED_ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
]

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
  }
}

interface CreateCheckoutRequest {
  eventId: string
  wrestlerName: string
  wrestlerAge: number
  wrestlerWeight?: string
  parentName: string
  parentEmail: string
  parentPhone?: string
  experienceLevel?: string
  notes?: string
}

export async function POST(request: Request) {
  try {
    validateEnv()

    const body = (await request.json()) as CreateCheckoutRequest

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const requiredFields: Array<keyof CreateCheckoutRequest> = [
      "eventId",
      "wrestlerName",
      "wrestlerAge",
      "parentName",
      "parentEmail",
    ]

    for (const field of requiredFields) {
      const value = body[field]
      if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    if (Number.isNaN(Number(body.wrestlerAge)) || body.wrestlerAge < 5 || body.wrestlerAge > 18) {
      return NextResponse.json({ error: "Wrestler age must be between 5 and 18" }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: event, error: eventError } = await admin
      .from("events")
      .select("id, title, start_date, start_time, end_time, location, category, coach, max_drop_ins")
      .eq("id", body.eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const maxDropIns = Number.isFinite(event.max_drop_ins) && event.max_drop_ins ? event.max_drop_ins : 10

    const { count: activeCount, error: countError } = await admin
      .from("drop_in_requests")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .in("payment_status", ["pending", "paid"])

    if (countError) {
      console.error("[calendar/stripe] Failed to count drop-in requests", countError)
      return NextResponse.json({ error: "Unable to validate drop-in capacity" }, { status: 500 })
    }

    if ((activeCount ?? 0) >= maxDropIns) {
      return NextResponse.json(
        {
          error: "This practice already has the maximum number of drop-ins.",
          code: "capacity_reached",
          maxDropIns,
        },
        { status: 409 },
      )
    }

    const amount = getDropInFeeCents()
    const rawStart = event.start_date
    const eventDate =
      typeof rawStart === "string" ? rawStart.slice(0, 10) : new Date().toISOString().split("T")[0]

    const parentPhone = body.parentPhone?.trim() || null
    const parentEmail = body.parentEmail.trim().toLowerCase()

    // Include denormalized event + contact fields required by drop_in_requests (NOT NULL / app expectations).
    const insertPayload = {
      event_id: event.id,
      wrestler_name: body.wrestlerName.trim(),
      wrestler_age: body.wrestlerAge,
      wrestler_weight: body.wrestlerWeight?.trim() || null,
      wrestler_experience: body.experienceLevel?.trim() || null,
      parent_name: body.parentName.trim(),
      parent_email: parentEmail,
      parent_phone: parentPhone,
      phone: parentPhone || parentEmail,
      notes: body.notes?.trim() ?? "",
      status: "pending",
      payment_status: "pending",
      payment_amount_cents: amount,
      payment_currency: "usd",
      event_title: event.title,
      event_date: eventDate,
      event_start_time: event.start_time ?? null,
      event_end_time: event.end_time ?? null,
      event_location: event.location ?? null,
      event_category: event.category ?? null,
      event_coach: event.coach ?? null,
      event_max_drop_ins: maxDropIns,
    }

    const { data: dropInRecord, error: insertError } = await admin
      .from("drop_in_requests")
      .insert(insertPayload)
      .select("*")
      .single()

    if (insertError || !dropInRecord) {
      console.error("[calendar/stripe] Failed to create drop-in request", insertError)
      return NextResponse.json(
        {
          error: "Unable to create drop-in request",
          ...(process.env.NODE_ENV !== "production" && insertError
            ? { debug: insertError.message, code: insertError.code }
            : {}),
        },
        { status: 500 },
      )
    }

    const stripe = getNcUnitedStripe()
    const baseUrl = getNcUnitedCalendarBaseUrl()

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: body.parentEmail,
        metadata: {
          drop_in_request_id: dropInRecord.id,
          event_id: String(event.id),
          business: "nc_united_calendar",
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: amount,
              product_data: {
                name: `NC United Drop-In: ${event.title}`,
                description: `Practice on ${eventDate}`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/calendar/drop-in/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/calendar/drop-in/cancel?event=${event.id}`,
      })

      await admin
        .from("drop_in_requests")
        .update({
          stripe_session_id: session.id,
          stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
        })
        .eq("id", dropInRecord.id)

      return NextResponse.json({
        sessionId: session.id,
        checkoutUrl: session.url,
        dropInRequestId: dropInRecord.id,
      })
    } catch (stripeError) {
      console.error("[calendar/stripe] Failed to create checkout session", stripeError)

      await admin.from("drop_in_requests").delete().eq("id", dropInRecord.id)

      return NextResponse.json({ error: "Unable to start checkout session" }, { status: 500 })
    }
  } catch (error) {
    console.error("[calendar/stripe] Unexpected error in create-checkout-session route", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
