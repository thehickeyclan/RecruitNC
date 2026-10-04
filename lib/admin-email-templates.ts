/**
 * Designed emails ready to send from /admin/messaging. Picking one fills the subject and the
 * pasted-HTML message, so a recap goes out without anyone copying code.
 *
 * Each `html` is a fragment, not a document: the blast template (lib/admin-blast-email-html.ts)
 * supplies the NC United header, the 560px column and the unsubscribe footer. Inline styles and
 * tables only, with absolute links, so it survives Gmail and Outlook.
 */

export type AdminEmailTemplate = { id: string; label: string; subject: string; html: string }

const SITE = "https://app.ncwrestlingunited.com"
const ARTICLE = `${SITE}/news/journeymen-fall-classic-2026-recap`
const profile = (id: string) => `${SITE}/view-profile?id=${id}`

const statCell = (value: string, label: string, last = false) =>
  `<td width="25%" align="center" style="padding:12px 4px;background:#0A1628;${last ? "" : "border-right:2px solid #ffffff;"}"><div style="font-size:26px;font-weight:bold;color:#D3B574;">${value}</div><div style="font-size:10px;color:#ffffff;letter-spacing:1px;">${label}</div></td>`

const wrestler = (id: string, name: string, text: string) =>
  `<li style="margin-bottom:8px;"><a href="${profile(id)}" target="_blank" style="color:#003366;font-weight:bold;">${name}</a> ${text}</li>`

const JOURNEYMEN_2026 = `
<a href="${ARTICLE}" target="_blank"><img src="${SITE}/images/news/journeymen-fall-classic-2026/nc-made-noise.png" width="512" alt="NC Made Noise: 3 main event placers, 1 Overflow champion, 4 state champions defeated, 8 wins over All-Americans" style="display:block;width:100%;height:auto;border:0;border-radius:8px;"></a>
<h1 style="margin:22px 0 12px;font-size:22px;line-height:1.25;color:#0A1628;">NC Made Noise at the Journeymen Fall Classic</h1>
<p style="margin:0 0 14px;">The Journeymen Fall Classic drew one of the toughest fields in the country: state champions, All-Americans and nationally ranked wrestlers from New York, Pennsylvania, New Jersey and beyond. Eighteen North Carolina wrestlers took it on, and NC made noise.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px;"><tr>
${statCell("3", "MAIN EVENT<br>PLACERS")}${statCell("1", "OVERFLOW<br>CHAMPION")}${statCell("4", "STATE CHAMPS<br>DEFEATED")}${statCell("8", "WINS OVER<br>ALL-AMERICANS", true)}
</tr></table>
<ul style="margin:0 0 18px;padding-left:20px;">
${wrestler("68696afb-0b22-465c-b22e-82e84913144e", "Carson Raper", "(South Rowan sophomore) placed 5th at 113, beating the Virginia 5A state champion and a Massachusetts state champion who is also an NHSCA All-American.")}
${wrestler("7bb99ea9-a0ff-4cd0-91f8-217327959105", "Jake Amiott", "(Topsail junior) placed 6th at 152, with wins over the Arizona D1 state champion, an NHSCA All-American and a New Jersey state placer.")}
${wrestler("63ea613d-0886-4af0-b64b-1c3d80fe0332", "Tobin McNair", "(Wakefield senior) placed 6th at 170, including a tech fall over the Connecticut state champion.")}
${wrestler("1a2d638e-5978-45d4-b6c8-bc95ba754367", "Luke Richards", "(Cardinal Gibbons junior) won the Overflow 4–0, beating a New Hampshire state champion and NHSCA All-American, to earn his way into the main event.")}
</ul>
<p style="margin:0 0 22px;">That's only part of it. The full story covers all 18 wrestlers, every match and every opponent's accolades.</p>
<p style="margin:0 0 26px;text-align:center;"><a href="${ARTICLE}" target="_blank" style="display:inline-block;background:#D3B574;color:#0A1628;font-size:15px;font-weight:bold;letter-spacing:1px;text-decoration:none;padding:14px 28px;border-radius:8px;">READ THE FULL STORY &rarr;</a></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#13294B;border-radius:10px;margin:0 0 22px;"><tr><td style="padding:22px;text-align:center;color:#ffffff;">
<div style="font-size:11px;letter-spacing:3px;color:#D3B574;font-weight:bold;">RECRUITNC PROFILES</div>
<div style="font-size:18px;font-weight:bold;margin:8px 0 6px;color:#ffffff;">Every NC wrestler has a free RecruitNC profile.</div>
<div style="font-size:14px;line-height:1.5;color:#cbd5e1;margin-bottom:14px;">Every match, opponent accolades, rankings and a scouting report.</div>
<a href="${SITE}/athletes" target="_blank" style="display:inline-block;background:#D3B574;color:#0A1628;font-size:13px;font-weight:bold;text-decoration:none;padding:11px 18px;border-radius:6px;margin:4px;">FIND YOUR WRESTLER</a>
<a href="${SITE}/auth/signup" target="_blank" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;font-size:13px;font-weight:bold;text-decoration:none;padding:10px 18px;border-radius:6px;margin:4px;">CLAIM A PROFILE, FREE</a>
<div style="font-size:12px;color:#cbd5e1;margin-top:12px;">College coach? <a href="${SITE}/auth/coach-signup" target="_blank" style="color:#D3B574;">Get free access to every profile</a></div>
</td></tr></table>
<div style="text-align:center;">
<div style="font-size:16px;font-weight:bold;color:#0A1628;">Be the first to know.</div>
<div style="font-size:14px;line-height:1.5;margin:6px 0 12px;">Get the NC United iPhone app and turn on alerts for results, rankings and stories like this one, the moment they drop.</div>
<a href="${SITE}/download" target="_blank" style="display:inline-block;border:2px solid #0A1628;color:#0A1628;font-size:13px;font-weight:bold;text-decoration:none;padding:10px 18px;border-radius:6px;">DOWNLOAD THE APP</a>
<div style="font-size:13px;color:#64748b;margin-top:18px;">Next stop: Super 32.</div>
</div>
`.trim()

export const ADMIN_EMAIL_TEMPLATES: AdminEmailTemplate[] = [
  {
    id: "journeymen-fall-classic-2026",
    label: "NC Made Noise: Journeymen recap (Oct 2026)",
    subject: "NC Made Noise at the Journeymen Fall Classic",
    html: JOURNEYMEN_2026,
  },
]
