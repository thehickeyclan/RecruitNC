"use client"

import { useCallback, useState } from "react"

type Props = {
  qrSrc: string
  donateUrl: string
  athleteDisplayName: string
}

export function FundraisingAthleteQrCard({ qrSrc, donateUrl, athleteDisplayName }: Props) {
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const copy = useCallback(async () => {
    setErr(null)
    try {
      await navigator.clipboard.writeText(donateUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setErr("Could not copy — select the link in your browser bar.")
    }
  }, [donateUrl])

  return (
    <div className="w-full max-w-[min(100%,18rem)] rounded-2xl border-2 border-white/25 bg-white p-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] sm:max-w-[19rem] sm:p-5 lg:max-w-[15rem] lg:p-3.5">
      <p className="font-[family-name:var(--font-fundraising-display)] text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#061224]/75 lg:text-[9px]">
        Scan to give
      </p>
      <p className="mx-auto mt-2 max-w-[16rem] text-center text-xs leading-snug text-[#061224]/55 lg:mt-1.5 lg:max-w-[13rem] lg:text-[10px]">
        Opens this athlete&apos;s gift page (bookmark or share). Same secure checkout — brightness up for scanning.
      </p>
      <div className="mt-4 flex justify-center rounded-lg bg-white p-2 lg:mt-3 lg:p-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrSrc}
          alt={`QR code: donate to ${athleteDisplayName}`}
          width={224}
          height={224}
          className="h-auto w-full max-w-[14rem] sm:max-w-[15.5rem] lg:max-w-[10.5rem]"
          decoding="async"
        />
      </div>
      <p className="sr-only">Donation link for {athleteDisplayName}</p>
      <button
        type="button"
        onClick={copy}
        className="font-[family-name:var(--font-fundraising-display)] mt-4 flex min-h-12 w-full touch-manipulation items-center justify-center rounded-md border-2 border-neutral-200 bg-neutral-50 text-xs font-bold uppercase tracking-[0.12em] text-[#061224] transition hover:border-neutral-300 hover:bg-neutral-100 active:scale-[0.99]"
      >
        {copied ? "Copied link" : "Copy donation link"}
      </button>
      {err ? <p className="mt-2 text-center text-[11px] text-red-700/90">{err}</p> : null}
    </div>
  )
}
