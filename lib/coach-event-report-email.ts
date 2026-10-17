/**
 * The post-tournament report a college coach receives for his starred wrestlers, as a branded,
 * finished email (Matt, 17 October 2026: "it needs to be branded and style needs to be better").
 *
 * Built for mail clients: tables, inline styles, no web fonts (the wordmark falls back to a heavy
 * italic system face), images optional. The brand - name, wordmark split, colours - is the coach
 * portal's own (lib/recruiting/brand.ts), so a coach clicking through lands where the email looks
 * like it came from. Everything shown is computed (lib/coach-event-report.ts); nothing is written.
 */
import { RECRUITING_BRAND } from "@/lib/recruiting/brand"
import { PROFILE_BASE_URL, type AthleteEventReport, type ReportEvent, type ReportResult } from "@/lib/coach-event-report"

const NAVY = "#0A1628"
const PANEL = "#0f1c2e"
const GOLD = "#D3B574"
const GOLD_DARK = "#8a6d2b"
const INK = "#0f172a"
const MUTED = "#64748b"
const LINE = "#e2e8f0"
const WIN = "#16a34a"
const LOSS = "#dc2626"
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const MARK_FONT = "'Arial Black','Helvetica Neue',Helvetica,Arial,sans-serif"

export type CoachReportEmailInput = {
  event: ReportEvent
  coachName: string | null
  program: string | null
  programLogo: string | null
  reports: readonly AthleteEventReport[]
  /** Profile photo per athlete id, when there is one worth showing. */
  photos?: ReadonlyMap<string, string>
  /** Notable losses are shown to verified college coaches only. */
  lossesVisible: boolean
  unsubscribeUrl?: string | null
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

const profileUrl = (id: string) => `${PROFILE_BASE_URL}/athletes/${encodeURIComponent(id)}`

function wordmark(size: number): string {
  const [lead, accent] = RECRUITING_BRAND.wordmark
  return `<span style="font-family:${MARK_FONT};font-weight:900;font-style:italic;font-size:${size}px;letter-spacing:-0.5px;text-transform:uppercase;color:#ffffff;">${esc(lead)}<span style="color:${GOLD};">${esc(accent)}</span></span>`
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("")
}

function avatar(r: AthleteEventReport, photo: string | undefined, size = 56): string {
  return photo
    ? `<img src="${esc(photo)}" width="${size}" height="${size}" alt="" style="display:block;width:${size}px;height:${size}px;border-radius:12px;object-fit:cover;background:${NAVY};border:0;">`
    : `<div style="width:${size}px;height:${size}px;border-radius:12px;background:${NAVY};color:${GOLD};font-family:${FONT};font-weight:800;font-size:${Math.round(size / 2.6)}px;line-height:${size}px;text-align:center;">${esc(initials(r.name))}</div>`
}

function finishBadge(r: AthleteEventReport): string {
  const placed = r.placement != null
  const label = placed ? (r.placement === "Champion" ? "CHAMPION" : `${r.placement} PLACE`.toUpperCase()) : "DID NOT PLACE"
  return `<span style="display:inline-block;padding:5px 10px;border-radius:999px;font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:0.6px;${placed ? `background:${GOLD};color:${NAVY};` : `background:#f1f5f9;color:#475569;border:1px solid ${LINE};`}">${esc(label)}</span>`
}

function resultRow(r: ReportResult, kind: "W" | "L"): string {
  const color = kind === "W" ? WIN : LOSS
  return `<tr>
<td valign="top" width="26" style="padding:6px 8px 6px 0;"><div style="width:22px;height:22px;border-radius:6px;background:${color};color:#fff;font-family:${FONT};font-size:12px;font-weight:800;line-height:22px;text-align:center;">${kind}</div></td>
<td valign="top" style="padding:6px 0;font-family:${FONT};font-size:14px;line-height:1.4;color:${INK};">
<strong>${esc(r.opponent)}</strong>${r.opponentSchool ? `<span style="color:${MUTED};"> · ${esc(r.opponentSchool)}</span>` : ""}${r.result ? `<span style="color:${MUTED};"> · ${esc(r.result)}</span>` : ""}
${r.credential ? `<div style="font-size:12px;font-weight:600;color:${GOLD_DARK};margin-top:2px;">${esc(r.credential)}</div>` : ""}
</td></tr>`
}

function sectionLabel(text: string): string {
  return `<div style="font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${MUTED};margin:14px 0 2px;">${esc(text)}</div>`
}

function competedCard(r: AthleteEventReport, photo: string | undefined, lossesVisible: boolean): string {
  const facts = [r.classYear ? `Class of ${r.classYear}` : null, r.school, r.weight ? `${r.weight} lb` : null].filter(Boolean).map(esc).join(" · ")
  const bouts = r.bouts
    .map((b) => `<span style="white-space:nowrap;"><span style="color:${b.outcome === "W" ? WIN : LOSS};font-weight:800;">${b.outcome}</span> ${esc(b.opponent)}${b.score || b.method ? ` <span style="color:#94a3b8;">${esc([b.method, b.score].filter(Boolean).join(" "))}</span>` : ""}</span>`)
    .join(`<span style="color:#cbd5e1;"> &nbsp;|&nbsp; </span>`)
  return `<tr><td style="padding:0 0 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${LINE};border-radius:14px;">
<tr><td style="padding:18px 18px 6px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="68" valign="top">${avatar(r, photo)}</td>
    <td valign="top" style="font-family:${FONT};">
      <a href="${profileUrl(r.athleteId)}" style="font-size:18px;font-weight:800;color:${INK};text-decoration:none;">${esc(r.name)}</a>
      <div style="font-size:13px;color:${MUTED};margin-top:2px;">${facts}</div>
      <div style="margin-top:8px;">${finishBadge(r)} <span style="font-family:${FONT};font-size:15px;font-weight:800;color:${INK};margin-left:6px;">${r.record.wins}-${r.record.losses}</span></div>
    </td>
  </tr></table>
  ${r.placementNote ? `<div style="font-family:${FONT};font-size:12px;color:${MUTED};margin-top:8px;">${esc(r.placementNote)}.</div>` : ""}
  ${r.significantWins.length ? `${sectionLabel(`Significant wins · ${r.significantWins.length}`)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${r.significantWins.map((w) => resultRow(w, "W")).join("")}</table>` : ""}
  ${lossesVisible && r.notableLosses.length ? `${sectionLabel(`Notable losses · ${r.notableLosses.length}`)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${r.notableLosses.map((l) => resultRow(l, "L")).join("")}</table>` : ""}
  ${bouts ? `${sectionLabel("Every bout")}<div style="font-family:${FONT};font-size:12px;line-height:1.7;color:#475569;">${bouts}</div>` : ""}
</td></tr>
<tr><td style="padding:10px 18px 16px;"><a href="${profileUrl(r.athleteId)}" style="font-family:${FONT};font-size:13px;font-weight:700;color:${NAVY};text-decoration:none;border-bottom:2px solid ${GOLD};">Open full profile &rarr;</a></td></tr>
</table>
</td></tr>`
}

function notCompetedGrid(list: readonly AthleteEventReport[]): string {
  const cells = list.map(
    (r) => `<td width="50%" valign="top" style="padding:6px 6px 6px 0;font-family:${FONT};">
<a href="${profileUrl(r.athleteId)}" style="font-size:14px;font-weight:700;color:${INK};text-decoration:none;">${esc(r.name)}</a>
<div style="font-size:12px;color:${MUTED};">${[r.classYear ? `${r.classYear}` : null, r.school].filter(Boolean).map(esc).join(" · ")}</div></td>`,
  )
  const rows: string[] = []
  for (let i = 0; i < cells.length; i += 2) rows.push(`<tr>${cells[i]}${cells[i + 1] ?? `<td width="50%"></td>`}</tr>`)
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join("")}</table>`
}

function statTile(value: number | string, label: string): string {
  return `<td width="25%" align="center" style="padding:14px 4px;background:${PANEL};border-radius:12px;">
<div style="font-family:${FONT};font-size:26px;font-weight:900;color:#ffffff;line-height:1;">${esc(value)}</div>
<div style="font-family:${FONT};font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${GOLD};margin-top:6px;">${esc(label)}</div></td>`
}

export function renderCoachReportEmailHtml(input: CoachReportEmailInput): { subject: string; html: string } {
  const { event, reports } = input
  const competed = reports.filter((r) => r.competed)
  const notCompeted = reports.filter((r) => !r.competed)
  const placed = competed.filter((r) => r.place != null)
  const sigWins = competed.reduce((n, r) => n + r.significantWins.length, 0)
  const coach = input.coachName ? `Coach ${input.coachName.trim().split(/\s+/).slice(-1)[0]}` : "Coach"
  const subject = `${event.name}: how your ${reports.length} starred wrestler${reports.length === 1 ? "" : "s"} did`
  const preheader = `${competed.length} of ${reports.length} competed${placed.length ? `, ${placed.length} placed` : ""}${sigWins ? `, ${sigWins} significant wins` : ""}.`

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#eef2f7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

<tr><td style="background:${NAVY};border-radius:16px 16px 0 0;padding:18px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td>${wordmark(22)}</td>
    <td align="right" style="font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:1.4px;color:${GOLD};">COACH REPORT</td>
  </tr></table>
</td></tr>

<tr><td style="background:${NAVY};padding:6px 24px 24px;border-top:1px solid rgba(211,181,116,0.25);">
  <div style="font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:${GOLD};margin-top:18px;">${esc(event.name)}${event.date ? ` · ${esc(new Date(`${event.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }))}` : ""}</div>
  <div style="font-family:${FONT};font-size:28px;line-height:1.15;font-weight:900;color:#ffffff;margin-top:8px;">How your starred wrestlers did</div>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px;"><tr>
    ${input.programLogo ? `<td style="padding-right:10px;"><img src="${esc(input.programLogo)}" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border-radius:8px;background:#ffffff;object-fit:contain;padding:3px;border:0;"></td>` : ""}
    <td style="font-family:${FONT};font-size:14px;color:rgba(255,255,255,0.75);">${esc(coach)}${input.program ? ` · ${esc(input.program)}` : ""}</td>
  </tr></table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="6" style="margin-top:16px;"><tr>
    ${statTile(reports.length, "Starred")}${statTile(competed.length, "Competed")}${statTile(placed.length, "Placed")}${statTile(sigWins, "Sig. wins")}
  </tr></table>
</td></tr>

<tr><td style="background:#f8fafc;padding:22px 16px 6px;border-left:1px solid ${LINE};border-right:1px solid ${LINE};">
  ${competed.length ? `<div style="font-family:${FONT};font-size:13px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${NAVY};margin:0 4px 12px;">Results · best finishes first</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${competed.map((r) => competedCard(r, input.photos?.get(r.athleteId), input.lossesVisible)).join("")}</table>` : `<div style="font-family:${FONT};font-size:15px;color:${INK};margin:0 4px 16px;">None of your starred wrestlers competed at ${esc(event.name)}.</div>`}
  ${notCompeted.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${LINE};border-radius:14px;margin-bottom:16px;"><tr><td style="padding:16px 18px;">
    <div style="font-family:${FONT};font-size:13px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${NAVY};">Did not compete · ${notCompeted.length}</div>
    <div style="font-family:${FONT};font-size:12px;color:${MUTED};margin:4px 0 8px;">Starred, but not in the ${esc(event.name)} brackets.</div>
    ${notCompetedGrid(notCompeted)}
  </td></tr></table>` : ""}
</td></tr>

<tr><td align="center" style="background:#f8fafc;padding:8px 16px 26px;border-left:1px solid ${LINE};border-right:1px solid ${LINE};">
  <a href="${PROFILE_BASE_URL}/my-recruits" style="display:inline-block;background:${GOLD};color:${NAVY};font-family:${FONT};font-size:15px;font-weight:800;text-decoration:none;padding:13px 26px;border-radius:10px;">Open My Recruits</a>
  <div style="font-family:${FONT};font-size:12px;color:${MUTED};margin-top:10px;">Every wrestler you star is in your next report.</div>
</td></tr>

<tr><td style="background:${NAVY};border-radius:0 0 16px 16px;padding:18px 24px;">
  <div>${wordmark(14)}</div>
  <div style="font-family:${FONT};font-size:11px;line-height:1.6;color:rgba(255,255,255,0.55);margin-top:8px;">
    Records and placements are computed from the tournament brackets. Significant wins and notable losses list only opponents with a ranking or a state or national placing on file.${input.lossesVisible ? " Notable losses are shared with verified college coaches only." : ""}
    ${input.unsubscribeUrl ? `<br><a href="${esc(input.unsubscribeUrl)}" style="color:rgba(255,255,255,0.55);">Unsubscribe</a>` : ""}
  </div>
</td></tr>

</table></td></tr></table>
</body></html>`
  return { subject, html }
}
