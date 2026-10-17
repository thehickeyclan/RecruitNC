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
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const MARK_FONT = "'Arial Black','Helvetica Neue',Helvetica,Arial,sans-serif"

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
function wordmark(size: number): string {
  const [lead, accent] = RECRUITING_BRAND.wordmark
  return `<span style="font-family:${MARK_FONT};font-weight:900;font-style:italic;font-size:${size}px;letter-spacing:-0.5px;text-transform:uppercase;color:#ffffff;">${esc(lead)}<span style="color:${GOLD};">${esc(accent)}</span></span>`
}

export type CoachWelcomeInput = {
  coachName: string | null
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

export function renderCoachWelcomeEmail(input: CoachWelcomeInput): { subject: string; html: string } {
  const coach = input.coachName ? `Coach ${input.coachName.trim().split(/\s+/).slice(-1)[0]}` : "Coach"
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

<tr><td style="background:#ffffff;padding:24px 24px 8px;border-left:1px solid ${LINE};border-right:1px solid ${LINE};font-family:${FONT};font-size:15px;line-height:1.6;color:#334155;">
  <p style="margin:0 0 14px;">You're one of ${input.coaches} college coaches from ${input.programs} programs${esc(named)} using ${esc(RECRUITING_BRAND.name)} to evaluate and engage wrestlers. We built it for you, so tell us what's working and what isn't: <strong>just reply to this email</strong>, it comes straight to me.</p>
</td></tr>

<tr><td style="background:#ffffff;padding:4px 24px 4px;border-left:1px solid ${LINE};border-right:1px solid ${LINE};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NAVY};border-radius:14px;"><tr><td style="padding:18px 20px;font-family:${FONT};">
    <div style="font-size:11px;font-weight:800;letter-spacing:1.4px;color:${GOLD};">STAR THIS WEEKEND · SUPER 32 IS OCT 24–25</div>
    <div style="font-size:20px;font-weight:900;color:#ffffff;margin-top:6px;line-height:1.25;">Star your recruits. Get their tournament report within 24 hours.</div>
    <div style="font-size:14px;line-height:1.55;color:rgba(255,255,255,0.78);margin-top:8px;">After every major tournament, starting with Super 32, you'll receive a report on every wrestler you've starred: <strong style="color:#fff;">placement, record, significant wins, notable losses</strong> and every bout.</div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px;"><tr>
      <td style="padding-right:8px;"><a href="${BASE}/public-rankings" style="display:inline-block;background:${GOLD};color:${NAVY};font-size:14px;font-weight:800;text-decoration:none;padding:11px 18px;border-radius:10px;">Open the rankings</a></td>
      <td><a href="${BASE}/coach-home" style="display:inline-block;border:1px solid rgba(211,181,116,0.6);color:${GOLD};font-size:14px;font-weight:800;text-decoration:none;padding:10px 16px;border-radius:10px;">Coach Home</a></td>
    </tr></table>
    <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:10px;">Open any profile or ranking and tap the &#9733;.</div>
  </td></tr></table>
</td></tr>

<tr><td style="background:#ffffff;padding:18px 24px 10px;border-left:1px solid ${LINE};border-right:1px solid ${LINE};">
  <div style="font-family:${FONT};font-size:13px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${NAVY};margin-bottom:4px;">What matters most</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${feature("&#9733;", "My Recruits", "Every wrestler you star goes onto your board: track activity, contacts and where each one is in your recruiting.")}
    ${feature("&#9783;", "Athlete profiles", "Every result we hold in one place: state, national and off-season events, records, and the weight they last competed at.")}
    ${feature("&#9776;", "Scouting reports", "A one-page report on any wrestler, free for college coaches.")}
    ${feature("&#9650;", "Strength of competition", "Who a wrestler has actually beaten, and where they compete.")}
  </table>
</td></tr>

<tr><td style="background:#ffffff;padding:6px 24px 24px;border-left:1px solid ${LINE};border-right:1px solid ${LINE};font-family:${FONT};font-size:15px;line-height:1.6;color:#334155;">
  <p style="margin:6px 0 14px;"><strong>Where we're going.</strong> Our goal is every state. <strong>South Carolina launches next week</strong>, and more states follow quickly.</p>
  <p style="margin:12px 0 0;">Thank you for being part of it,</p>
  <p style="margin:2px 0 0;font-weight:800;color:${INK};">Matt Hickey</p>
  <p style="margin:0;color:${MUTED};font-size:13px;">${esc(RECRUITING_BRAND.name)}</p>
</td></tr>

<tr><td style="background:${NAVY};border-radius:0 0 16px 16px;padding:18px 24px;">
  <div>${wordmark(14)}</div>
  <div style="font-family:${FONT};font-size:11px;line-height:1.6;color:rgba(255,255,255,0.55);margin-top:8px;">You're receiving this because you have a college coach account on ${esc(RECRUITING_BRAND.name)}.${input.unsubscribeUrl ? `<br><a href="${esc(input.unsubscribeUrl)}" style="color:rgba(255,255,255,0.55);">Unsubscribe</a>` : ""}</div>
</td></tr>

</table></td></tr></table>
</body></html>`
  return { subject, html }
}
