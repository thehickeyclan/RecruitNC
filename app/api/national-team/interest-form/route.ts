import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizePhoneForStorage } from "@/lib/phone-format"
import { findAndEnrichAthlete, buildEnrichmentPayload } from "@/lib/enrich-athlete-profile"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const adminClient = createAdminClient()

    // Validate required fields
    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "cellPhone",
      "highSchool",
      "clubTeam",
      "graduationYear",
      "primaryWeight",
    ]

    for (const field of requiredFields) {
      if (!body[field] || (typeof body[field] === "string" && !body[field].trim())) {
        return NextResponse.json({ ok: false, error: `${field} is required` }, { status: 400 })
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({ ok: false, error: "Invalid email format" }, { status: 400 })
    }

    // Validate tournament interest
    if (!body.tournamentInterest || !Array.isArray(body.tournamentInterest) || body.tournamentInterest.length === 0) {
      return NextResponse.json({ ok: false, error: "At least one tournament must be selected" }, { status: 400 })
    }

    // Validate secondary weight doesn't match primary
    if (body.secondaryWeight && body.secondaryWeight === body.primaryWeight) {
      return NextResponse.json(
        { ok: false, error: "Secondary weight cannot be the same as primary weight" },
        { status: 400 }
      )
    }

    // Save to database
    const { data: submission, error: dbError } = await adminClient
      .from("national_team_interest_forms")
      .insert([
        {
          first_name: body.firstName.trim(),
          last_name: body.lastName.trim(),
          email: body.email.trim(),
          cell_phone: body.cellPhone?.trim() ? normalizePhoneForStorage(body.cellPhone.trim()) : "",
          high_school: body.highSchool.trim(),
          club_team: body.clubTeam.trim(),
          graduation_year: body.graduationYear,
          primary_weight: body.primaryWeight,
          secondary_weight: body.secondaryWeight || null,
          previous_teams: body.previousTeams || [],
          tournament_interest: body.tournamentInterest,
          comments: body.comments?.trim() || null,
          status: "pending",
        },
      ])
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ ok: false, error: "Failed to save submission" }, { status: 500 })
    }

    try {
      const gradYear = typeof body.graduationYear === "number" ? body.graduationYear : parseInt(String(body.graduationYear), 10)
      const enrichPayload = buildEnrichmentPayload({
        contact_email: body.email.trim(),
        phone: body.cellPhone?.trim() ? normalizePhoneForStorage(body.cellPhone.trim()) : undefined,
        firstname: body.firstName.trim(),
        lastname: body.lastName.trim(),
        highschool: body.highSchool.trim(),
        weightclass: body.primaryWeight,
        wrestling_club: body.clubTeam?.trim() || undefined,
      })
      await findAndEnrichAthlete(adminClient, {
        email: body.email.trim(),
        name: `${body.firstName} ${body.lastName}`.trim(),
        graduationYear: Number.isFinite(gradYear) ? gradYear : undefined,
        school: body.highSchool?.trim(),
      }, enrichPayload)
    } catch (enrichErr) {
      console.error("[national-team/interest-form] athlete enrichment:", enrichErr)
    }

    // Format email content
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "full",
      timeStyle: "long",
    })

    const tournamentNames: Record<string, string> = {
      nhsca: "NHSCA National Duals (May 23-25)",
      aau: "AAU Scholastic Duals - All-Star Boys (June 24-26)",
    }

    const emailBody = `
NC United National Team - Spring/Summer 2026 Interest Form Submission

Submitted: ${timestamp}

CONTACT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
First Name: ${body.firstName}
Last Name: ${body.lastName}
Email: ${body.email}
Cell Phone: ${body.cellPhone}

SCHOOL & CLUB INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
High School: ${body.highSchool}
Club Team: ${body.clubTeam}
Graduation Year: ${body.graduationYear}

WEIGHT CLASSES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Primary Weight Class: ${body.primaryWeight} lbs
Secondary Weight Class: ${body.secondaryWeight || "Not specified"}

PREVIOUS NC UNITED EXPERIENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${body.previousTeams && body.previousTeams.length > 0 ? body.previousTeams.join(", ") : "None"}

TOURNAMENT INTEREST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${body.tournamentInterest.map((id: string) => tournamentNames[id] || id).join("\n")}

ADDITIONAL COMMENTS/QUESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${body.comments || "None provided"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated email from the NC United National Team Interest Form.
Please respond directly to ${body.email} to contact this athlete.
`

    // Send email using Resend API (if configured)
    // You can also use other services like SendGrid, Mailgun, or Nodemailer
    if (process.env.RESEND_API_KEY) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "NC United Wrestling <noreply@ncunitedwrestling.com>",
            to: ["ncunitedwrestling@gmail.com"],
            replyTo: body.email,
            subject: `NC United National Team Interest: ${body.firstName} ${body.lastName} (${body.graduationYear})`,
            text: emailBody,
          }),
        })

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text()
          console.error("Failed to send email via Resend:", errorText)
          // Continue anyway - the form submission is still valid
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError)
        // Continue anyway - the form submission is still valid
      }
    } else {
      // If no email service is configured, log the submission for manual processing
      console.log("=".repeat(80))
      console.log("NC UNITED NATIONAL TEAM INTEREST FORM SUBMISSION")
      console.log("=".repeat(80))
      console.log(emailBody)
      console.log("=".repeat(80))
      console.log("\n⚠️  Email service not configured. Please set RESEND_API_KEY in environment variables.")
      console.log("For now, the submission has been logged above for manual processing.\n")
    }

    return NextResponse.json({
      ok: true,
      message: "Interest form submitted successfully",
      submissionId: submission.id,
    })
  } catch (error: any) {
    console.error("Error processing interest form:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to process form submission",
      },
      { status: 500 }
    )
  }
}
