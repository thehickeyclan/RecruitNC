/**
 * The welcome email for a new Recruiting Command Center subscriber (Matt, 6 Nov 2026: "where to
 * start, no more than 3 simple steps", with links). Two of the first three families paid and
 * never opened the college list or Scout. Sent once per subscription from the Stripe fulfilment,
 * on either account; the brand follows the account that billed it.
 *
 * Sent once: the ledger is purchase_receipt_emails, keyed "welcome:<subscription id>".
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { BRAND_SITE, type UserBrand } from "@/lib/recruiting/user-brand"
import { completenessFromRow } from "@/lib/profile-completeness"
import { gradeOf } from "@/lib/recruiting/academic-checkin"
import { hasAnsweredPriorities } from "@/lib/recruiting/priorities/store"

/** What the email knows about the wrestler, so the steps fit this family. */
export type WelcomeContext = {
  athleteId: string | null
  /** The open profile items, in the order the profile asks for them (lib/profile-completeness.ts). */
  profileTodos: Array<{ todo: string; edit: string }>
  /** 9 to 12, or null when unknown. */
  grade: number | null
  /** The family already finished "What matters to your family". */
  answeredPriorities?: boolean
}

export type WelcomeInput = { brand: UserBrand; parentFirstName: string | null; wrestlerFirstName: string | null; context?: WelcomeContext }

/** The name a family knows us by (never "RecruitNC" or "NC United Wrestling" in an email). */
const NAME: Record<UserBrand, string> = { recruitwrestlers: "RecruitWrestlers", ncunited: "NC United" }

const COLORS: Record<UserBrand, { bg: string; accent: string; accentText: string }> = {
  recruitwrestlers: { bg: "#0B1426", accent: "#A3E635", accentText: "#0B1426" },
  ncunited: { bg: "#0A1628", accent: "#D3B574", accentText: "#0A1628" },
}

/**
 * Up to three steps, in Matt's order (6 Nov 2026): the "What matters to your family" survey first
 * (its answers build the suggested colleges), then finish the profile when anything is missing,
 * find colleges on the map and add them to the list, fill out interest forms once the wrestler is
 * in 10th grade, then learn how recruiting works. The first three that apply are the email.
 */
export function welcomeSteps(brand: UserBrand, wrestler: string, ctx?: WelcomeContext) {
  const url = BRAND_SITE[brand].url
  const steps: Array<{ key: string; title: string; body: string; cta: string; href: string }> = []
  const todos = ctx?.profileTodos ?? []
  if (!ctx?.answeredPriorities) {
    steps.push({
      key: "priorities",
      title: "Tell us what matters to your family",
      body: `A few minutes of questions: your goals for ${wrestler}, distance from home, cost, academics and the level you are aiming for. Your answers build a list of colleges that fit ${wrestler}.`,
      cta: "Start the survey",
      href: `${url}/my-recruiting/priorities`,
    })
  }
  if (ctx?.athleteId && todos.length) {
    steps.push({
      key: "profile",
      title: `Finish ${wrestler}'s profile`,
      body: `College coaches look at the profile first. Still to do: ${todos.map((t) => t.todo.toLowerCase()).join(", ")}.`,
      cta: "Finish the profile",
      href: `${url}/athletes/${ctx.athleteId}?edit=${todos[0].edit}`,
    })
  }
  steps.push({
    key: "map",
    title: "Find colleges and add them to your list",
    body: `Use the college map to see every wrestling program by state and division. Add the ones you like to ${wrestler}'s list. Each one shows the full yearly cost and how much room the team has at ${wrestler}'s weight.`,
    cta: "Open the college map",
    href: `${url}/recruiting/college-map`,
  })
  if (ctx?.grade != null && ctx.grade >= 10) {
    steps.push({
      key: "forms",
      title: "Fill out college interest forms",
      body: `Every college has a recruiting form. Filling it out puts ${wrestler} in front of that program's coaches. We keep the forms for the colleges on your list in one place.`,
      cta: "Open interest forms",
      href: `${url}/my-recruiting/questionnaires`,
    })
  }
  steps.push({
    key: "learn",
    title: "Learn how recruiting works",
    body: "The rules, the timeline by grade, costs and aid, and the questions families ask most, in plain words.",
    cta: "Open Learn",
    href: `${url}/my-recruiting/learn`,
  })
  return steps.slice(0, 3)
}

export function commandCenterWelcomeEmail(input: WelcomeInput) {
  const site = BRAND_SITE[input.brand]
  const c = COLORS[input.brand]
  const wrestler = input.wrestlerFirstName?.trim() || "your wrestler"
  const hi = input.parentFirstName?.trim() ? `Hi ${esc(input.parentFirstName.trim())},` : "Hi,"
  const steps = welcomeSteps(input.brand, wrestler, input.context)
  const learnLeftOut = !steps.some((x) => x.key === "learn")
  const home = `${site.url}/my-recruiting`
  const subject = "Welcome to the Command Center: start here"

  const stepHtml = steps
    .map(
      (s, i) => `
      <tr><td style="padding:0 0 18px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px">
          <tr><td style="padding:16px 18px">
            <p style="margin:0 0 4px 0;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#6b7280">Step ${i + 1}</p>
            <p style="margin:0 0 6px 0;font-size:17px;font-weight:800;color:#111827">${esc(s.title)}</p>
            <p style="margin:0 0 12px 0;font-size:14px;line-height:21px;color:#374151">${esc(s.body)}</p>
            <a href="${s.href}" style="display:inline-block;background:${c.bg};color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:10px 16px;border-radius:8px">${esc(s.cta)} →</a>
          </td></tr>
        </table>
      </td></tr>`,
    )
    .join("")

  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
      <tr><td style="background:${c.bg};padding:22px 24px">
        <p style="margin:0;font-size:12px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:${c.accent}">${esc(NAME[input.brand])}</p>
        <p style="margin:6px 0 0 0;font-size:24px;font-weight:900;color:#ffffff">Welcome to the Command Center</p>
      </td></tr>
      <tr><td style="padding:22px 24px 4px 24px">
        <p style="margin:0 0 10px 0;font-size:15px;color:#111827">${hi}</p>
        <p style="margin:0 0 18px 0;font-size:15px;line-height:22px;color:#374151">Thank you for joining. Here is where to start with ${esc(wrestler)}. Each step takes a few minutes.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${stepHtml}</table>
        <p style="margin:0 0 8px 0;font-size:15px;line-height:22px;color:#374151">${learnLeftOut ? `When you have time, <a href="${site.url}/my-recruiting/learn" style="color:#111827;font-weight:700">Learn</a> explains the rules and the timeline. ` : ""}Everything else lives on your <a href="${home}" style="color:#111827;font-weight:700">Command Center home</a>. There is a box at the bottom of that page to tell us how we are doing. We read every one.</p>
        <p style="margin:16px 0 24px 0;font-size:15px;color:#111827">Matt<br><span style="color:#6b7280">${esc(NAME[input.brand])}</span></p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`

  const text = [
    hi,
    "",
    `Thank you for joining. Here is where to start with ${wrestler}. Each step takes a few minutes.`,
    "",
    ...steps.flatMap((s, i) => [`${i + 1}. ${s.title}`, s.body, s.href, ""]),
    ...(learnLeftOut ? [`When you have time, Learn explains the rules and the timeline: ${site.url}/my-recruiting/learn`] : []),
    `Everything else lives on your Command Center home: ${home}`,
    "There is a box at the bottom of that page to tell us how we are doing. We read every one.",
    "",
    "Matt",
    NAME[input.brand],
  ].join("\n")

  return { subject, html, text }
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** Look up the family, then send once. Never throws: a failed email must not fail the payment. */
export async function sendCommandCenterWelcome(
  admin: SupabaseClient,
  input: { userId: string; subscriptionRef: string; brand: UserBrand; dryRun?: boolean },
): Promise<{ status: "sent" | "already" | "skipped"; to?: string; email?: ReturnType<typeof commandCenterWelcomeEmail> }> {
  try {
    const { data: me } = await admin.from("user_profiles").select("first_name, full_name, email").eq("user_id", input.userId).maybeSingle()
    const to = String(me?.email ?? "").trim()
    if (!to) return { status: "skipped" }
    const [{ data: links }, { data: own }] = await Promise.all([
      admin.from("parent_athlete_links").select("athlete_id").eq("user_id", input.userId),
      admin.from("athletes").select("id").eq("claimed_by_user_id", input.userId),
    ])
    const ids = [...new Set([...(links ?? []).map((l) => String(l.athlete_id)), ...(own ?? []).map((a) => String(a.id))])]
    const { data: kids } = ids.length
      ? await admin.from("athletes").select('id, "firstName", graduationyear, photourl, highschool, academic_gpa, academic_sat, academic_act, highlight_video_url, phone, "contactEmail"').in("id", ids)
      : { data: [] as Record<string, unknown>[] }
    // Wrestlers still in high school first: the one the family is recruiting for now.
    const rows = ((kids ?? []) as Record<string, unknown>[]).filter((k) => gradeOf(Number(k.graduationyear) || null, new Date()) != null)
    const list = rows.length ? rows : ((kids ?? []) as Record<string, unknown>[])
    const names = [...new Set(list.map((k) => String(k.firstName ?? "").trim()).filter(Boolean))]
    const lead = list[0] ?? null
    const context: WelcomeContext | undefined = lead
      ? {
          athleteId: String(lead.id),
          profileTodos: completenessFromRow(lead).items.filter((i) => !i.done).map((i) => ({ todo: i.todo, edit: i.edit })),
          grade: gradeOf(Number(lead.graduationyear) || null, new Date()),
          answeredPriorities: await hasAnsweredPriorities(admin, input.userId, String(lead.id)).catch(() => false),
        }
      : undefined
    const parentFirstName = String(me?.first_name ?? "").trim() || String(me?.full_name ?? "").trim().split(/\s+/)[0] || null
    const email = commandCenterWelcomeEmail({ brand: input.brand, parentFirstName, wrestlerFirstName: names.length ? names.join(" and ") : null, context })
    if (input.dryRun) return { status: "skipped", to, email }

    const ref = `welcome:${input.subscriptionRef}`
    const { error: claimErr } = await admin.from("purchase_receipt_emails").insert({ stripe_ref: ref, kind: "command_center_welcome", recipient_email: to, amount_cents: 0 })
    if (claimErr) return { status: "already", to }
    if (!process.env.RESEND_API_KEY) {
      await admin.from("purchase_receipt_emails").delete().eq("stripe_ref", ref)
      return { status: "skipped", to }
    }
    const { Resend } = await import("resend")
    const site = BRAND_SITE[input.brand]
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: `${NAME[input.brand]} <info@ncwrestlingunited.com>`,
      to: [to],
      replyTo: site.support,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })
    if ((result as { error?: unknown }).error) {
      await admin.from("purchase_receipt_emails").delete().eq("stripe_ref", ref)
      console.error("[command-center-welcome] send failed", (result as { error?: unknown }).error)
      return { status: "skipped", to }
    }
    return { status: "sent", to }
  } catch (e) {
    console.error("[command-center-welcome]", e instanceof Error ? e.message : e)
    return { status: "skipped" }
  }
}
