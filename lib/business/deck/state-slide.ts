import { RECRUITING_BRAND } from "@/lib/recruiting/brand"

import type { StateSummary } from "@/lib/business/metrics"

/**
 * The per-state slide, built from live numbers at the moment it is opened.
 *
 * It is never in `DECK_SLIDES` and never in the PDF (Matt, 4 November 2026). Two reasons, and
 * both of them bite:
 *
 * - A downloaded PDF outlives the numbers printed on it. Hand one to a family in January and it
 *   still says what was true in November.
 * - A thin state argues against the person presenting it. South Carolina on 4 November had 784
 *   profiles, 4 claims and no coach views at all. `stateSlideReady` is what stops that slide
 *   going up, and the presenter can leave it out whenever they like anyway.
 *
 * Same navy and lime as the twelve, same 1920x1080, so it does not announce itself as bolted on.
 */

/** Whether a state has enough to stand behind: somebody claimed, and some program looked. */
export function stateSlideReady(s: StateSummary): boolean {
  return s.claimed > 0 && s.viewed > 0
}

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const n = (v: number) => v.toLocaleString("en-US")

function tile(value: string, label: string, note: string): string {
  return `<div style="flex:1;display:flex;flex-direction:column;gap:8px;background:#121F38;padding:34px;border:1px solid #1E2C48;border-radius:18px">
<p style="font-family:'Oswald', Arial, sans-serif;font-size:76px;font-weight:700;line-height:1;color:#A3E635">${esc(value)}</p>
<p style="font-size:27px;font-weight:700;line-height:1.25;color:#F2F5F8">${esc(label)}</p>
<p style="font-size:22px;line-height:1.3;color:#A8B3C5">${esc(note)}</p>
</div>`
}

export function stateSlideHtml(
  s: StateSummary,
  split: { boys: number; girls: number },
  now = new Date(),
): string {
  const name = RECRUITING_BRAND.states.find((x) => x.code === s.state)?.name ?? s.state
  const asOf = now.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "America/New_York" })

  return `<section id="state-live" data-transition="fade" style="background:#0B1426;color:#F2F5F8;font-family:'Public Sans', Verdana, sans-serif;padding:128px 128px 160px;display:flex;flex-direction:column;gap:40px">
<div style="display:flex;flex-direction:column;gap:12px">
<p style="font-family:'Oswald', Arial, sans-serif;font-size:26px;font-weight:600;letter-spacing:5px;text-transform:uppercase;color:#A3E635">${esc(name)} today</p>
<h2 style="font-family:'Oswald', Arial, sans-serif;font-size:76px;font-weight:600;line-height:1.05">This is already happening in ${esc(name)}.</h2>
</div>
<div style="display:flex;gap:24px;align-items:stretch">
${tile(n(s.profiles), "Wrestlers with a profile", `${n(s.current)} in a class a college coach can still recruit`)}
${tile(n(s.programs), "College programs looking", `${n(s.views)} profile opens in all`)}
${tile(n(s.starred), "Starred by a program", "A star means that coach is following them")}
</div>
<div style="display:flex;gap:24px;align-items:stretch">
${tile(n(s.viewed), "Wrestlers a coach has opened", "Every one of them is on a coach's screen")}
${tile(n(s.claimed), "Families already here", "They claimed the profile and took it over")}
${tile(`${n(split.boys)} / ${n(split.girls)}`, "Boys / girls with a profile", "Every class, on the same platform")}
</div>
<p style="position:absolute;left:128px;bottom:64px;font-size:24px;color:#7E8CA3">${esc(name)}, read live on ${esc(asOf)}. Not part of the PDF.</p>
</section>`
}

/** What to say while it is up. */
export function stateSlideNotes(s: StateSummary): string {
  const name = RECRUITING_BRAND.states.find((x) => x.code === s.state)?.name ?? s.state
  return `Read the middle number out loud: ${s.programs} college programs have opened a ${name} wrestler's profile, and ${s.viewed} wrestlers here have been looked at. That is the one thing no recruiting service in this state can show a family, because it comes from coaches being on the platform rather than from anybody's mailing list. These numbers were read when you opened this slide, so they are true today and they are not in anything you hand out. If the room asks how many of those are Division I, open the map on the footprint slide and filter it in front of them.`
}
