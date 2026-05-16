import { NextResponse } from "next/server"
import { generateText } from "ai"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { buildFundraisingHubSnapshot } from "@/lib/fundraising/hub-data"

export const dynamic = "force-dynamic"

export async function GET() {
  const adminCheck = await requireAdmin()
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  const admin = createAdminClient()

  try {
    // Gather all the data we need for AI analysis
    const [
      hubSnapshot,
      { data: pendingActivations },
      { data: pendingExpenses },
      { data: paidExpenses },
      { data: recentDonations },
      { data: activeProfiles },
      { data: parentLinks }
    ] = await Promise.all([
      buildFundraisingHubSnapshot(),
      admin
        .from("fundraising_activation_requests")
        .select("id, fundraising_slug, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
      admin
        .from("athlete_expense_requests")
        .select("id, athlete_id, amount_cents, created_at, description")
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
      admin
        .from("athlete_expense_requests")
        .select("amount_cents")
        .eq("status", "paid"),
      admin
        .from("spartan_donations")
        .select("amount_cents, created_at, donor_name, athlete_code")
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("athlete_fundraising_profiles")
        .select("athlete_id, slug, total_raised_cents, campaign_goal_cents, is_active, checkout_live")
        .eq("is_active", true)
        .eq("checkout_live", true),
      admin
        .from("parent_athlete_links")
        .select("athlete_id, user_id")
    ])

    // Calculate metrics
    const totalRaised = hubSnapshot.hero.totalRaisedCents
    const totalDonations = hubSnapshot.hero.giftCount
    const totalReimbursed = paidExpenses?.reduce((sum, e) => sum + (Number(e.amount_cents) || 0), 0) || 0
    const available = totalRaised - totalReimbursed

    // Calculate time-based metrics
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const recentDonationsThisWeek = recentDonations?.filter(d => new Date(d.created_at) > weekAgo) || []
    const raisedThisWeek = recentDonationsThisWeek.reduce((sum, d) => sum + (d.amount_cents || 0), 0)

    // Find athletes close to goal
    const athletesCloseToGoal = activeProfiles?.filter(p => {
      const raised = p.total_raised_cents || 0
      const goal = p.campaign_goal_cents || 50000
      const remaining = goal - raised
      return remaining > 0 && remaining <= 10000 && raised > 0 // Within $100 of goal
    }) || []

    // Find old pending activations (over 48 hours)
    const oldPendingActivations = pendingActivations?.filter(a => {
      const created = new Date(a.created_at)
      const hoursOld = (now.getTime() - created.getTime()) / (1000 * 60 * 60)
      return hoursOld > 48
    }) || []

    // Find old pending expenses
    const oldPendingExpenses = pendingExpenses?.filter(e => {
      const created = new Date(e.created_at)
      const hoursOld = (now.getTime() - created.getTime()) / (1000 * 60 * 60)
      return hoursOld > 48
    }) || []

    // Build context for AI
    const context = {
      totalRaised: (totalRaised / 100).toFixed(2),
      totalDonations,
      totalReimbursed: (totalReimbursed / 100).toFixed(2),
      available: (available / 100).toFixed(2),
      raisedThisWeek: (raisedThisWeek / 100).toFixed(2),
      donationsThisWeek: recentDonationsThisWeek.length,
      pendingActivations: pendingActivations?.length || 0,
      oldPendingActivations: oldPendingActivations.length,
      pendingExpenses: pendingExpenses?.length || 0,
      oldPendingExpenses: oldPendingExpenses.length,
      activePages: activeProfiles?.length || 0,
      athletesCloseToGoal: athletesCloseToGoal.length,
      recentLargeDonations: recentDonations?.filter(d => d.amount_cents >= 10000).slice(0, 3) || [],
    }

    // Generate AI summary and recommendations
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      system: `You are an AI assistant for NC United Wrestling's fundraising management. 
Generate a brief, actionable summary and recommendations based on the fundraising data.
Be concise - use 2-3 short sentences for summary, and 2-4 bullet points for recommendations.
Focus on what needs attention NOW. Use specific numbers.
Format as JSON with "summary" (string) and "recommendations" (array of strings).
Each recommendation should be actionable and specific.`,
      prompt: `Current fundraising status:
- Total Raised: $${context.totalRaised} from ${context.totalDonations} donations
- This Week: $${context.raisedThisWeek} from ${context.donationsThisWeek} donations
- Total Reimbursed: $${context.totalReimbursed}
- Available Balance: $${context.available}
- Active Fundraising Pages: ${context.activePages}
- Pending Activation Requests: ${context.pendingActivations} (${context.oldPendingActivations} over 48hrs old)
- Pending Expense Requests: ${context.pendingExpenses} (${context.oldPendingExpenses} over 48hrs old)
- Athletes within $100 of goal: ${context.athletesCloseToGoal}
${context.recentLargeDonations.length > 0 ? `- Recent large donations (≥$100): ${context.recentLargeDonations.map(d => `$${(d.amount_cents/100).toFixed(0)} from ${d.donor_name || 'Anonymous'}`).join(', ')}` : ''}

Generate summary and recommendations.`,
    })

    // Parse AI response
    let parsed
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: text, recommendations: [] }
    } catch {
      parsed = { summary: text, recommendations: [] }
    }

    return NextResponse.json({
      summary: parsed.summary || "Unable to generate summary",
      recommendations: parsed.recommendations || [],
      metrics: context,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error("[AI Insights] Error:", error)
    return NextResponse.json({ 
      error: "Failed to generate insights",
      summary: "Unable to load AI insights at this time.",
      recommendations: [],
      metrics: null
    }, { status: 500 })
  }
}
