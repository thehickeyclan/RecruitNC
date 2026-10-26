import { RANKINGS_UPDATE } from "@/lib/rankings-update-notice"

/**
 * Both Super 32 2026 recaps, to everyone on NC United who isn't a college coach (Matt, 26 Oct 2026).
 * A short letter (the format that reaches the inbox), a text twin, both recaps, claim the profile,
 * Insider, and new rankings by Friday. "NC United", never "NC United Wrestling".
 */
const BASE = "https://app.ncwrestlingunited.com"
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export function renderSuper32RecapsEmail(input: { firstName: string | null; unsubscribeUrl: string | null }): { subject: string; html: string; text: string } {
  const subject = "Super 32 2026: our North Carolina recaps are up"
  const hello = input.firstName ? `Hi ${input.firstName},` : "Hi,"
  const mens = `${BASE}/news/super32-2026-nc-boys-recap`
  const womens = `${BASE}/news/super32-2026-nc-girls-recap`
  const claim = `${BASE}/create-profile`
  const insider = `${BASE}/rankings`
  const blocks: Array<{ text: string; link?: [string, string] }> = [
    { text: hello },
    { text: "Super 32 is in the books, and our recaps of how North Carolina did in Greensboro are up." },
    { text: "Men's: North Carolina's boys beat 11 top-15 seeds, up from six last year and two in 2024, and Braylen Yates medaled.", link: ["Read the men's recap", mens] },
    { text: "Women's: Lauren Samuel and Ella Taylor both finished 3rd, the best finishes by any North Carolinian, and Samuel is now a two-time Super 32 All-American.", link: ["Read the women's recap", womens] },
    { text: "Every North Carolina wrestler is graded, and every match lists the opponent's seed, national ranking and state titles." },
    { text: "If your wrestler competed, claim their profile free to see their grade and every result.", link: ["Claim a profile", claim] },
    { text: `Insider members see every grade, Super 32 HQ, the full rankings and which college programs viewed their wrestler. New North Carolina rankings come out by ${RANKINGS_UPDATE.by}, updated with ${RANKINGS_UPDATE.events} results.`, link: ["Sign up for Insider", insider] },
  ]
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:#1f2937;">
${blocks.map((b) => `<p style="margin:0 0 14px;">${esc(b.text)}${b.link ? ` <a href="${b.link[1]}" style="color:#1d4ed8;font-weight:600;">${esc(b.link[0])}</a>` : ""}</p>`).join("\n")}
<p style="margin:18px 0 0;">Matt Hickey<br>NC United</p>
${input.unsubscribeUrl ? `<p style="margin:28px 0 0;font-size:12px;color:#9ca3af;"><a href="${esc(input.unsubscribeUrl)}" style="color:#9ca3af;">Unsubscribe</a></p>` : ""}
</div></body></html>`
  const text = [...blocks.map((b) => (b.link ? `${b.text}\n${b.link[0]}: ${b.link[1]}` : b.text)), "Matt Hickey\nNC United", ...(input.unsubscribeUrl ? [`Unsubscribe: ${input.unsubscribeUrl}`] : [])].join("\n\n")
  return { subject, html, text }
}
