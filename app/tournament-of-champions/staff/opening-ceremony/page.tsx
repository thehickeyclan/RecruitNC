import type { Metadata } from "next"

import {
  OPENING_CEREMONY_MC,
  OPENING_CEREMONY_NOTES,
  OPENING_CEREMONY_SCRIPT,
  OPENING_CEREMONY_TIMELINE,
  OPENING_CEREMONY_WHEN,
} from "@/lib/toc/opening-ceremony"

export const metadata: Metadata = {
  title: "Opening Ceremony Script | Tournament of Champions 2026",
  description: "Friday's opening ceremony timeline and script for the MC.",
  robots: { index: false, follow: false },
}

/** Read from a phone at the microphone: timeline first, then each segment in large type. */
export default function OpeningCeremonyPage() {
  return (
    <main className="min-h-screen bg-[#0A1628] pb-24 text-white">
      <header className="sticky top-0 z-10 border-b border-[#D3B574]/30 bg-[#0A1628]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D3B574]">Tournament of Champions</p>
            <h1 className="text-xl font-extrabold leading-tight">Opening Ceremony</h1>
          </div>
          <a href="/tournament-of-champions/staff" className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-sm text-white/70">
            Staff hub
          </a>
        </div>
      </header>

      <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 pt-5">
        <p className="text-sm text-white/55">
          {OPENING_CEREMONY_WHEN} · MC {OPENING_CEREMONY_MC}
        </p>

        <section className="rounded-2xl border border-white/10 bg-[#0f1f38] p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D3B574]">Timeline</p>
          <ol className="mt-2 flex flex-col">
            {OPENING_CEREMONY_TIMELINE.map((step) => (
              <li key={step.time + step.segment} className="grid grid-cols-[4.5rem_1fr] gap-3 border-b border-white/5 py-2 last:border-b-0">
                <span className="font-bold tabular-nums text-white">{step.time}</span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-snug">{step.segment}</span>
                  <span className="block text-sm text-white/50">
                    {[step.length, step.athletes].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {OPENING_CEREMONY_SCRIPT.map((segment) => (
          <section key={segment.id} className="rounded-2xl border border-white/10 bg-[#0f1f38] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">{segment.time}</p>
            <h2 className="mt-1 text-3xl font-extrabold leading-tight">{segment.title}</h2>
            {segment.cue ? <p className="mt-2 text-base italic text-[#D3B574]">{segment.cue}</p> : null}
            {segment.script ? (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D3B574]">Read aloud</p>
                {segment.script.map((line) => (
                  <p key={line} className="text-xl leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>
            ) : null}
            {segment.points ? (
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D3B574]">Talking points — in your own words</p>
                <ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-xl leading-relaxed marker:text-[#D3B574]">
                  {segment.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ))}

        <section className="rounded-2xl border border-[#CC0000]/40 bg-[#CC0000]/[0.08] p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ff8a8a]">Notes for Jason</p>
          <ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed">
            {OPENING_CEREMONY_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
