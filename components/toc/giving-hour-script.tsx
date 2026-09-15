"use client"

import { useEffect, useState } from "react"

import type { GivingHourSponsor } from "@/lib/toc/giving-hour"

const STORAGE_KEY = "toc-giving-hour-drawn-2026"

type Props = {
  time: string
  mc: string
  opening: string
  sponsors: GivingHourSponsor[]
  thanks: { name: string; for: string; logo?: string }[]
  scholarship: string
  drawCount: number
  /** A gift that goes out with every prize — shown as a badge on each prize row. */
  withEveryPrize?: { name: string; label: string; logo: string }
}

function readDrawn(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

/** Big-type reading script. Ticks live only on the phone that made them. */
export function GivingHourScript({ time, mc, opening, sponsors, thanks, scholarship, drawCount, withEveryPrize }: Props) {
  const [drawn, setDrawn] = useState<Record<string, boolean>>({})

  useEffect(() => setDrawn(readDrawn()), [])

  function toggle(key: string) {
    setDrawn((current) => {
      const next = { ...current, [key]: !current[key] }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // A phone that refuses storage still works; the ticks just don't survive a reload.
      }
      return next
    })
  }

  const done = Object.values(drawn).filter(Boolean).length

  return (
    <main className="min-h-screen bg-[#0A1628] pb-24 text-white">
      <header className="sticky top-0 z-10 border-b border-[#D3B574]/30 bg-[#0A1628]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D3B574]">Tournament of Champions</p>
            <h1 className="text-xl font-extrabold leading-tight">The Giving Hour</h1>
          </div>
          <p className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-sm font-semibold tabular-nums text-white/80">
            {done} / {drawCount} drawn
          </p>
        </div>
      </header>

      <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 pt-5">
        <p className="text-sm text-white/55">
          {time} · MC {mc}
        </p>

        {/* Running order: the scholarship first, then every raffle together, then the sponsors who gave without a draw. */}
        <section className="rounded-2xl border border-[#CC0000]/40 bg-[#CC0000]/[0.08] p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ff8a8a]">Start with</p>
          <h2 className="mt-1 text-2xl font-extrabold leading-tight">The Caden Perry Warrior Scholarship</h2>
          <p className="mt-2 text-xl leading-relaxed">{scholarship}</p>
        </section>

        <h2 className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-[#D3B574]">Raffles</h2>

        <section className="rounded-2xl border border-[#D3B574]/35 bg-[#D3B574]/[0.07] p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D3B574]">Open the raffles with</p>
          <p className="mt-2 text-xl leading-relaxed">{opening}</p>
        </section>

        {sponsors.map((sponsor, index) => (
          <section key={sponsor.id} className="rounded-2xl border border-white/10 bg-[#0f1f38] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
              Sponsor {index + 1} of {sponsors.length}
            </p>
            <div className="mt-1 flex items-center gap-3">
              {sponsor.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sponsor.logo}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 shrink-0 rounded-lg bg-white object-contain"
                />
              ) : null}
              <h2 className="text-3xl font-extrabold leading-tight">{sponsor.name}</h2>
            </div>

            {sponsor.about ? (
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D3B574]">Read aloud</p>
                <p className="mt-1.5 text-xl leading-relaxed text-white">{sponsor.about}</p>
              </div>
            ) : null}

            {sponsor.note ? <p className="mt-4 text-xl leading-relaxed text-white">{sponsor.note}</p> : null}

            {sponsor.prizes.length > 0 ? (
              <div className="mt-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D3B574]">
                  {sponsor.prizes.length === 1 ? "Draw one winner" : `Draw ${sponsor.prizes.length} winners — one prize each`}
                </p>
                <ul className="mt-2 flex flex-col gap-2">
                  {sponsor.prizes.map((prize, prizeIndex) => {
                    const key = `${sponsor.id}:${prizeIndex}`
                    const isDrawn = Boolean(drawn[key])
                    return (
                      <li key={key}>
                        <label
                          className={`flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border px-4 py-3 transition-colors ${
                            isDrawn ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-white/[0.03]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isDrawn}
                            onChange={() => toggle(key)}
                            className="h-7 w-7 shrink-0 accent-emerald-400"
                          />
                          {prize.image ? (
                            // Plain img: sponsor photos arrive as small thumbnails, and upscaling one
                            // through next/image would only blur it.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={prize.image}
                              alt={prize.item}
                              width={84}
                              height={56}
                              className="h-14 w-[84px] shrink-0 rounded-lg bg-white object-contain"
                            />
                          ) : null}
                          <span className="min-w-0">
                            <span className={`block text-lg font-semibold leading-snug ${isDrawn ? "text-white/60 line-through" : "text-white"}`}>
                              {prize.item}
                            </span>
                            {prize.detail ? <span className="block text-base text-white/60">{prize.detail}</span> : null}
                            {withEveryPrize ? (
                              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[#0A1628]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={withEveryPrize.logo} alt="" width={40} height={14} className="h-3.5 w-auto" />
                                {withEveryPrize.label}
                              </span>
                            ) : null}
                          </span>
                          <span className="ml-auto shrink-0 text-xs font-bold uppercase tracking-wide text-emerald-300">
                            {isDrawn ? "Drawn" : ""}
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}
          </section>
        ))}

        {thanks.length > 0 ? (
          <section className="rounded-2xl border border-white/10 bg-[#0f1f38] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D3B574]">Thank you to our sponsors</p>
            <ul className="mt-3 flex flex-col gap-3">
              {thanks.map((row) => (
                <li key={row.name} className="flex items-center gap-3">
                  {row.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.logo}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain"
                    />
                  ) : null}
                  <div>
                    <p className="text-xl font-semibold">{row.name}</p>
                    <p className="text-base text-white/60">{row.for}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}


        {done > 0 ? (
          <button
            type="button"
            onClick={() => {
              setDrawn({})
              try {
                window.localStorage.removeItem(STORAGE_KEY)
              } catch {
                // Nothing stored to clear.
              }
            }}
            className="self-center rounded-full border border-white/15 px-4 py-2 text-sm text-white/55 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D3B574]"
          >
            Clear all ticks
          </button>
        ) : null}
      </div>
    </main>
  )
}
