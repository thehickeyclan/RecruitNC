/**
 * Welcome / thank-you email to college coaches who have signed up (Matt, 17 October 2026): thanks,
 * an invitation to send feedback, the vision (every state; South Carolina next week), the features
 * that matter, and the Super 32 report - star wrestlers this weekend.
 *
 * Sent as RecruitNC, the name coaches signed up under and land on (app.ncwrestlingunited.com). No
 * Guild wording: the Guild Recruiting move is not public. Same look as the tournament report
 * (lib/coach-event-report-email.ts). Mail-client safe: tables and inline styles.
 */
import { RECRUITING_BRAND } from "@/lib/recruiting/brand"

const BASE = "https://app.ncwrestlingunited.com"
const NAVY = "#0A1628"
const PANEL = "#0f1c2e"
const GOLD = "#D3B574"
const INK = "#0f172a"
const MUTED = "#64748b"
const LINE = "#e2e8f0"
const GOLD_DARK = "#8a6d2b"
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const MARK_FONT = "'Arial Black','Helvetica Neue',Helvetica,Arial,sans-serif"

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
function wordmark(size: number): string {
  const [lead, accent] = RECRUITING_BRAND.wordmark
  return `<span style="font-family:${MARK_FONT};font-weight:900;font-style:italic;font-size:${size}px;letter-spacing:-0.5px;text-transform:uppercase;color:#ffffff;">${esc(lead)}<span style="color:${GOLD};">${esc(accent)}</span></span>`
}

/**
 * "Coach Morrill" from what the coach typed: "eric morrill" and "SCOTT BOSAK" are capitalised,
 * names already mixed-case ("McDonald", "LaHaye") are left alone, and a name that is only the email
 * prefix, a single word ("tallen", "radskya"), gives plain "Coach" - never a coach's username.
 */
export function coachSalutation(name: string | null | undefined, email?: string | null): string {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean)
  // One word is a username or a first name alone ("tallen", "radskya"). Two words that happen to
  // spell the email prefix are still a name: Billy Gordy is billygordy@.
  void email
  if (parts.length < 2) return "Coach"
  let last = parts[parts.length - 1]!
  if (last === last.toLowerCase() || last === last.toUpperCase()) {
    last = last.toLowerCase().replace(/(^|[-'])([a-z])/g, (_m: string, sep: string, ch: string) => sep + ch.toUpperCase())
  }
  return `Coach ${last}`
}

export type CoachWelcomeInput = {
  coachName: string | null
  /** For telling a real name from a username. */
  coachEmail?: string | null
  program: string | null
  programLogo: string | null
  /** Platform-wide, counted at send time. */
  coaches: number
  programs: number
  /** Programs to name, recognisable first. */
  namedPrograms: string[]
  /** Programs by level, in display order: [["DI", 12], ["DII", 13], ...]. Empty levels are left out. */
  divisions?: Array<[string, number]>
  unsubscribeUrl?: string | null
}

function feature(icon: string, title: string, body: string): string {
  return `<tr><td valign="top" width="44" style="padding:10px 12px 10px 0;"><div style="width:36px;height:36px;border-radius:10px;background:${NAVY};color:${GOLD};font-size:18px;line-height:36px;text-align:center;">${icon}</div></td>
<td valign="top" style="padding:10px 0;font-family:${FONT};"><div style="font-size:15px;font-weight:800;color:${INK};">${esc(title)}</div><div style="font-size:14px;line-height:1.5;color:#475569;margin-top:2px;">${body}</div></td></tr>`
}

/** One newsletter section: a small kicker, a heading, then its content; a rule above every one but the first. */
function section(kicker: string, title: string, content: string, last = false): string {
  return `<tr><td style="background:#ffffff;padding:${last ? "22px 24px 26px" : "22px 24px 18px"};border-left:1px solid ${LINE};border-right:1px solid ${LINE};font-family:${FONT};font-size:15px;line-height:1.6;color:#334155;">
  <div style="border-top:1px solid ${LINE};padding-top:20px;">
    <div style="font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:${GOLD_DARK};">${esc(kicker)}</div>
    <div style="font-size:21px;font-weight:900;color:${INK};line-height:1.25;margin:4px 0 12px;">${esc(title)}</div>
    ${content}
  </div>
</td></tr>`
}

export function renderCoachWelcomeEmail(input: CoachWelcomeInput): { subject: string; html: string } {
  const coach = coachSalutation(input.coachName, input.coachEmail)
  const subject = "Thank you, and your Super 32 reports start next week"
  const named = input.namedPrograms.length ? `, including ${input.namedPrograms.slice(0, -1).join(", ")} and ${input.namedPrograms.at(-1)}` : ""
  const preheader = "Star wrestlers this weekend: within 24 hours of the Super 32 finals you get a report on every one."
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#eef2f7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

<tr><td style="background:${NAVY};border-radius:16px 16px 0 0;padding:18px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td>${wordmark(22)}</td>
    <td align="right" style="font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:1.4px;color:${GOLD};">BUILT FOR COLLEGE COACHES</td>
  </tr></table>
</td></tr>

<tr><td style="background:${NAVY};padding:4px 24px 26px;border-top:1px solid rgba(211,181,116,0.25);">
  <div style="font-family:${FONT};font-size:28px;line-height:1.15;font-weight:900;color:#ffffff;margin-top:18px;">Thank you, ${esc(coach)}.</div>
  ${input.program ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>
    ${input.programLogo ? `<td style="padding-right:10px;"><img src="${esc(input.programLogo)}" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border-radius:8px;background:#ffffff;object-fit:contain;padding:3px;border:0;"></td>` : ""}
    <td style="font-family:${FONT};font-size:14px;color:rgba(255,255,255,0.75);">${esc(input.program)}</td></tr></table>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="6" style="margin-top:16px;"><tr>
    <td width="50%" align="center" style="padding:14px 4px;background:${PANEL};border-radius:12px;"><div style="font-family:${FONT};font-size:26px;font-weight:900;color:#fff;line-height:1;">${input.coaches}</div><div style="font-family:${FONT};font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${GOLD};margin-top:6px;">College coaches</div></td>
    <td width="50%" align="center" style="padding:14px 4px;background:${PANEL};border-radius:12px;"><div style="font-family:${FONT};font-size:26px;font-weight:900;color:#fff;line-height:1;">${input.programs}</div><div style="font-family:${FONT};font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${GOLD};margin-top:6px;">College programs</div></td>
  </tr></table>
  ${(input.divisions ?? []).filter(([, n]) => n > 0).length ? `<div style="font-family:${FONT};font-size:13px;font-weight:800;letter-spacing:0.6px;color:#ffffff;text-align:center;margin-top:12px;">${(input.divisions ?? [])
    .filter(([, n]) => n > 0)
    .map(([d, n]) => `<span style="white-space:nowrap;">${n} <span style="color:${GOLD};">${esc(d)}</span></span>`)
    .join(`<span style="color:rgba(255,255,255,0.35);"> &nbsp;·&nbsp; </span>`)}</div>` : ""}
</td></tr>

${section("Thank you", "You're part of something special.", `
  <p style="margin:0 0 12px;">You're one of ${input.coaches} college coaches from ${input.programs} programs${esc(named)} using ${esc(RECRUITING_BRAND.name)} to evaluate and engage wrestlers. <strong>We are building this for you.</strong></p>
  <p style="margin:0;">Tell us what's working and what isn't: <strong>just reply to this email</strong>, it comes straight to me.</p>`)}

${section("The platform", "What matters most", `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${feature("&#9733;", "My Recruits", "Every wrestler you star goes onto your board: track activity, contacts and where each one is in your recruiting.")}
    ${feature("&#9783;", "Athlete profiles", "Every result we hold in one place: state, national and off-season events, records, and the weight they last competed at.")}
    ${feature("&#9776;", "Scouting reports", "A one-page report on any wrestler, free for college coaches.")}
    ${feature("&#9650;", "Strength of competition", "Who a wrestler has beaten, along with each competitor's accolades.")}
  </table>`)}

${section("New · Super 32, Oct 24–25", "Tournament reports on your recruits", `
  <p style="margin:0 0 14px;">After every major tournament, starting with Super 32, you'll get a report on how your recruits performed: <strong>placement, record, significant wins, notable losses and strength of competition</strong>, with every bout. It arrives within 24 hours of the finals, for every wrestler you've starred.</p>
  <img src="${BASE}/email/super32-report-sample.jpg" width="552" alt="Sample Super 32 report: placement, record, significant wins with each opponent's accolades" style="display:block;width:100%;max-width:552px;height:auto;border:1px solid ${LINE};border-radius:12px;">
  <div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${MUTED};margin-top:8px;">Sample report · 2025 Super 32</div>`)}

<tr><td style="background:#ffffff;padding:8px 24px 8px;border-left:1px solid ${LINE};border-right:1px solid ${LINE};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NAVY};border-radius:14px;"><tr><td align="center" style="padding:22px 18px;font-family:${FONT};">
    <div style="font-size:11px;font-weight:800;letter-spacing:1.4px;color:${GOLD};">START TODAY</div>
    <div style="font-size:20px;font-weight:900;color:#ffffff;margin-top:6px;line-height:1.25;">Star your recruits before Super 32</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.75);margin-top:6px;">Open any profile or ranking and tap the &#9733;.</div>
    <!-- All three land on Coach Home (Matt, 17 Oct 2026): the coach's hub, signed in, in the coach portal. -->
    <div style="margin-top:16px;">
      <a href="${BASE}/coach-home" style="display:inline-block;background:${GOLD};color:${NAVY};font-size:14px;font-weight:800;text-decoration:none;padding:11px 18px;border-radius:10px;margin:0 4px 8px;">Open the rankings</a>
      <a href="${BASE}/coach-home" style="display:inline-block;border:1px solid rgba(211,181,116,0.6);color:${GOLD};font-size:14px;font-weight:800;text-decoration:none;padding:10px 16px;border-radius:10px;margin:0 4px 8px;">Browse all athletes</a>
      <a href="${BASE}/coach-home" style="display:inline-block;border:1px solid rgba(211,181,116,0.6);color:${GOLD};font-size:14px;font-weight:800;text-decoration:none;padding:10px 16px;border-radius:10px;margin:0 4px 8px;">Coach Home</a>
    </div>
  </td></tr></table>
</td></tr>

${section("Where we're going", "Every state", `
  <p style="margin:0 0 18px;">Our goal is every state. <strong>South Carolina launches next week</strong>, and more states follow quickly.</p>
  <p style="margin:0;">Thank you for being part of it,</p>
  <p style="margin:2px 0 0;font-weight:800;color:${INK};">Matt Hickey</p>
  <p style="margin:0;color:${MUTED};font-size:13px;">${esc(RECRUITING_BRAND.name)}</p>`, true)}

<tr><td style="background:${NAVY};border-radius:0 0 16px 16px;padding:18px 24px;">
  <div>${wordmark(14)}</div>
  <div style="font-family:${FONT};font-size:11px;line-height:1.6;color:rgba(255,255,255,0.55);margin-top:8px;">You're receiving this because you have a college coach account on ${esc(RECRUITING_BRAND.name)}.${input.unsubscribeUrl ? `<br><a href="${esc(input.unsubscribeUrl)}" style="color:rgba(255,255,255,0.55);">Unsubscribe</a>` : ""}</div>
</td></tr>

</table></td></tr></table>
</body></html>`
  return { subject, html }
}

/* ------------------------------------------------------------------ invitation */

export type CoachInviteInput = {
  coachName: string | null
  coachEmail?: string | null
  program: string | null
  programLogo: string | null
  /** Coaches and programs on the platform, counted at send time. */
  coaches: number
  programs: number
  divisions?: Array<[string, number]>
  unsubscribeUrl?: string | null
}

const SIGNUP_URL = `${BASE}/auth/signup?type=college-coach`

/** "Oklahoma State University–Stillwater (Oklahoma State)" reads as "Oklahoma State": the directory's short name when it gives one. */
export function programDisplayName(program: string | null | undefined): string | null {
  const p = String(program ?? "").trim()
  if (!p) return null
  const short = p.match(/\(([^()]+)\)\s*$/)?.[1]?.trim()
  // A bracketed state tells two schools apart ("King's College (PA)", "Pacific University (Oregon)"):
  // keep the whole name. Only a bracketed short name replaces it ("... (Oklahoma State)").
  if (!short || /^[A-Z]{2}$/.test(short) || isStateName(short)) return p
  return short
}
function isStateName(s: string): boolean {
  const t = s.toLowerCase()
  return ["alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware","florida","georgia","hawaii","idaho","illinois","indiana","iowa","kansas","kentucky","louisiana","maine","maryland","massachusetts","michigan","minnesota","mississippi","missouri","montana","nebraska","nevada","new hampshire","new jersey","new mexico","new york","north carolina","north dakota","ohio","oklahoma","oregon","pennsylvania","rhode island","south carolina","south dakota","tennessee","texas","utah","vermont","virginia","washington","west virginia","wisconsin","wyoming"].includes(t)
}

/**
 * Invitation to college coaches who have not signed up (Matt, 17 October 2026): the same newsletter
 * design as the welcome email, written for someone who has never used it - what it is, the Super
 * 32 report, and one button to free coach access. No other program is named. Sent as RecruitNC.
 */
export function renderCoachInviteEmail(input: CoachInviteInput): { subject: string; html: string } {
  const coach = coachSalutation(input.coachName, input.coachEmail)
  // Personal, and no "free" in the subject or preview: the first version landed in Gmail's Promotions tab (Matt, 17 Oct 2026).
  const subject = coach === "Coach" ? "Super 32 reports on the wrestlers you're recruiting" : `${coach}, Super 32 reports on the wrestlers you're recruiting`
  const preheader = `${input.coaches} college coaches from ${input.programs} programs use it. Star your recruits before Oct 24.`
  const levels = (input.divisions ?? []).filter(([, n]) => n > 0)
  const button = (label: string) =>
    `<a href="${SIGNUP_URL}" style="display:inline-block;background:${GOLD};color:${NAVY};font-family:${FONT};font-size:15px;font-weight:800;text-decoration:none;padding:13px 24px;border-radius:10px;">${esc(label)}</a>`
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#eef2f7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

<tr><td style="background:${NAVY};border-radius:16px 16px 0 0;padding:18px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td>${wordmark(22)}</td>
    <td align="right" style="font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:1.4px;color:${GOLD};">BUILT FOR COLLEGE COACHES</td>
  </tr></table>
</td></tr>

<tr><td style="background:${NAVY};padding:4px 24px 26px;border-top:1px solid rgba(211,181,116,0.25);">
  <div style="font-family:${FONT};font-size:14px;color:rgba(255,255,255,0.75);margin-top:18px;">${esc(coach)},</div>
  <div style="font-family:${FONT};font-size:28px;line-height:1.15;font-weight:900;color:#ffffff;margin-top:6px;">Recruit North Carolina wrestlers. Free for college coaches.</div>
  ${input.program ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>
    ${input.programLogo ? `<td style="padding-right:10px;"><img src="${esc(input.programLogo)}" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border-radius:8px;background:#ffffff;object-fit:contain;padding:3px;border:0;"></td>` : ""}
    <td style="font-family:${FONT};font-size:14px;color:rgba(255,255,255,0.75);">For ${esc(programDisplayName(input.program))}</td></tr></table>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="6" style="margin-top:16px;"><tr>
    <td width="50%" align="center" style="padding:14px 4px;background:${PANEL};border-radius:12px;"><div style="font-family:${FONT};font-size:26px;font-weight:900;color:#fff;line-height:1;">${input.coaches}</div><div style="font-family:${FONT};font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${GOLD};margin-top:6px;">College coaches already on it</div></td>
    <td width="50%" align="center" style="padding:14px 4px;background:${PANEL};border-radius:12px;"><div style="font-family:${FONT};font-size:26px;font-weight:900;color:#fff;line-height:1;">${input.programs}</div><div style="font-family:${FONT};font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${GOLD};margin-top:6px;">College programs</div></td>
  </tr></table>
  ${levels.length ? `<div style="font-family:${FONT};font-size:13px;font-weight:800;letter-spacing:0.6px;color:#ffffff;text-align:center;margin-top:12px;">${levels
    .map(([d, n]) => `<span style="white-space:nowrap;">${n} <span style="color:${GOLD};">${esc(d)}</span></span>`)
    .join(`<span style="color:rgba(255,255,255,0.35);"> &nbsp;·&nbsp; </span>`)}</div>` : ""}
  <div style="text-align:center;margin-top:20px;">${button("Create a free account now")}</div>
</td></tr>

${section("Why coaches use it", "Everything on a wrestler, in one place", `
  <p style="margin:0 0 6px;">${esc(RECRUITING_BRAND.name)} is where college coaches evaluate and engage North Carolina wrestlers. Access is free for college coaches and immediate when you sign up.</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${feature("&#9783;", "Athlete profiles", "Every result we hold in one place: state, national and off-season events, records, and the weight they last competed at.")}
    ${feature("&#9776;", "Scouting reports", "A one-page report on any wrestler, free for college coaches.")}
    ${feature("&#9650;", "Strength of competition", "Who a wrestler has beaten, along with each competitor's accolades.")}
    ${feature("&#9733;", "My Recruits", "Star a wrestler and they go onto your board: track activity, contacts and where each one is in your recruiting.")}
  </table>`)}

${section("New · Super 32, Oct 24–25", "Tournament reports on your recruits", `
  <p style="margin:0 0 14px;">After every major tournament, starting with Super 32, coaches get a report on how their recruits performed: <strong>placement, record, significant wins, notable losses and strength of competition</strong>, with every bout, within 24 hours of the finals. <strong>Sign up and star your recruits before Oct 24</strong> to get yours.</p>
  <img src="${BASE}/email/super32-report-sample.jpg" width="552" alt="Sample Super 32 report: placement, record, significant wins with each opponent's accolades" style="display:block;width:100%;max-width:552px;height:auto;border:1px solid ${LINE};border-radius:12px;">
  <div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${MUTED};margin-top:8px;">Sample report · 2025 Super 32</div>`)}

<tr><td style="background:#ffffff;padding:8px 24px 8px;border-left:1px solid ${LINE};border-right:1px solid ${LINE};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NAVY};border-radius:14px;"><tr><td align="center" style="padding:22px 18px;font-family:${FONT};">
    <div style="font-size:11px;font-weight:800;letter-spacing:1.4px;color:${GOLD};">FREE · BEFORE SUPER 32</div>
    <div style="font-size:20px;font-weight:900;color:#ffffff;margin-top:6px;line-height:1.25;">Three steps to your Super 32 report</div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px auto 16px;max-width:400px;">
      <tr><td valign="top" width="34" style="padding:6px 10px 6px 0;"><div style="width:26px;height:26px;border-radius:999px;background:${GOLD};color:${NAVY};font-size:13px;font-weight:900;line-height:26px;text-align:center;">1</div></td>
        <td valign="top" style="padding:6px 0;text-align:left;"><div style="font-size:15px;font-weight:800;color:#ffffff;">Create your free account</div><div style="font-size:13px;color:rgba(255,255,255,0.7);">One minute with your school email. Access is instant.</div></td></tr>
      <tr><td valign="top" width="34" style="padding:6px 10px 6px 0;"><div style="width:26px;height:26px;border-radius:999px;background:${GOLD};color:${NAVY};font-size:13px;font-weight:900;line-height:26px;text-align:center;">2</div></td>
        <td valign="top" style="padding:6px 0;text-align:left;"><div style="font-size:15px;font-weight:800;color:#ffffff;">Star athletes before Super 32</div><div style="font-size:13px;color:rgba(255,255,255,0.7);">Tap the &#9733; on any profile or ranking.</div></td></tr>
      <tr><td valign="top" width="34" style="padding:6px 10px 6px 0;"><div style="width:26px;height:26px;border-radius:999px;background:${GOLD};color:${NAVY};font-size:13px;font-weight:900;line-height:26px;text-align:center;">3</div></td>
        <td valign="top" style="padding:6px 0;text-align:left;"><div style="font-size:15px;font-weight:800;color:#ffffff;">Get your Super 32 report</div><div style="font-size:13px;color:rgba(255,255,255,0.7);">Within 24 hours of the finals: placement, record, significant wins, notable losses.</div></td></tr>
    </table>
    ${button("Create a free account now")}
  </td></tr></table>
</td></tr>

${section("Where we're going", "Every state", `
  <p style="margin:0 0 18px;">We cover North Carolina today. Our goal is every state: <strong>South Carolina launches next week</strong>, and more states follow quickly. Questions or ideas? Just reply to this email; it comes straight to me.</p>
  <p style="margin:2px 0 0;font-weight:800;color:${INK};">Matt Hickey</p>
  <p style="margin:0;color:${MUTED};font-size:13px;">${esc(RECRUITING_BRAND.name)}</p>`, true)}

<tr><td style="background:${NAVY};border-radius:0 0 16px 16px;padding:18px 24px;">
  <div>${wordmark(14)}</div>
  <div style="font-family:${FONT};font-size:11px;line-height:1.6;color:rgba(255,255,255,0.55);margin-top:8px;">You're receiving this because you're listed as a college wrestling coach. Not for you? Unsubscribe below and you won't hear from us again.${input.unsubscribeUrl ? `<br><a href="${esc(input.unsubscribeUrl)}" style="color:rgba(255,255,255,0.55);">Unsubscribe</a>` : ""}</div>
</td></tr>

</table></td></tr></table>
</body></html>`
  return { subject, html }
}

/* ------------------------------------------------------------------ invitation as a letter */

/**
 * The invitation as a short personal letter from Matt: no images, no buttons, one link, and a
 * plain-text twin. The designed version went to Gmail's Promotions tab twice (17 Oct 2026); cold
 * outreach that reads like a person writing lands in the inbox.
 */
export function renderCoachInviteLetter(input: CoachInviteInput): { subject: string; html: string; text: string } {
  const coach = coachSalutation(input.coachName, input.coachEmail)
  const subject = coach === "Coach" ? "Super 32 reports on the wrestlers you're recruiting" : `${coach}, Super 32 reports on the wrestlers you're recruiting`
  const levels = (input.divisions ?? []).filter(([, n]) => n > 0).map(([d, n]) => `${n} ${d}`).join(", ")
  const brand = RECRUITING_BRAND.name
  // A follow-up, not an introduction: these coaches have heard from us before (Matt, 17 Oct 2026).
  // Contact details and academics are not on every profile (about 40-65% of ranked athletes), so
  // they are described as growing, never as "every".
  const paras = [
    `${coach},`,
    `Super 32 is Oct 24–25. Star the wrestlers you're recruiting on ${brand}, and within 24 hours of the finals you'll get a report on each one: placement, record, significant wins and notable losses.`,
    `${brand} has state and national results for every elite wrestler in North Carolina, plus GPA, academic interests and contact information, which families keep adding, and strength of competition: who each wrestler has beaten and those opponents' accolades. ${input.coaches} college coaches from ${input.programs} programs${levels ? ` (${levels})` : ""} are using it, and we're expanding state by state, starting with South Carolina next week.`,
    `It also runs your whole recruiting process. Every wrestler you star goes onto your My Recruits board, shared with your staff: move each one from prospect to signed, log calls, texts and visits, and message families directly. It's free for every college coach: NCAA, NAIA and NJCAA.`,
  ]
  const steps = [
    `Create your coach account. Access is instant:`,
    `Star the wrestlers you're following, on any profile or ranking.`,
    `Get your Super 32 report the day after the finals.`,
  ]
  const after = [`Questions? Just reply. It comes straight to me.`]
  const p = (t: string) => `<p style="margin:0 0 14px;">${esc(t)}</p>`
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:#1f2937;">
${paras.map(p).join("\n")}
<ol style="margin:0 0 14px;padding-left:22px;">
  <li style="margin:0 0 6px;">${esc(steps[0])} <a href="${SIGNUP_URL}" style="color:#1d4ed8;">${SIGNUP_URL.replace(/^https:\/\//, "")}</a></li>
  <li style="margin:0 0 6px;">${esc(steps[1])}</li>
  <li style="margin:0 0 6px;">${esc(steps[2])}</li>
</ol>
${after.map(p).join("\n")}
<p style="margin:18px 0 0;">Matt Hickey<br>${esc(brand)}</p>
${input.unsubscribeUrl ? `<p style="margin:28px 0 0;font-size:12px;color:#9ca3af;">Not recruiting North Carolina? <a href="${esc(input.unsubscribeUrl)}" style="color:#9ca3af;">Unsubscribe</a> and you won't hear from us again.</p>` : ""}
</div></body></html>`
  const text = [
    ...paras,
    `1. ${steps[0]} ${SIGNUP_URL}`,
    `2. ${steps[1]}`,
    `3. ${steps[2]}`,
    "",
    ...after,
    "",
    `Matt Hickey`,
    brand,
    ...(input.unsubscribeUrl ? ["", `Not recruiting North Carolina? Unsubscribe: ${input.unsubscribeUrl}`] : []),
  ].join("\n\n").replace(/\n\n\n\n/g, "\n\n")
  return { subject, html, text }
}
