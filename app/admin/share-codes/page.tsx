"use client"

/**
 * QR codes staff hand out at events and print on materials, each with its link, a download and
 * where to use it. Rendered in the browser from the link, so a code here always matches its link.
 * A code never goes on the page it points to; it moves someone from paper or another screen onto
 * their phone (Matt, 25 Oct 2026).
 */
import { useEffect, useState } from "react"
import QRCode from "qrcode"

type ShareCode = { key: string; title: string; url: string; use: string }

const CODES: ShareCode[] = [
  {
    key: "college-coach-signup",
    title: "College coach sign-up",
    url: "https://www.ncwrestlingunited.com/auth/signup?type=college-coach",
    use: "Event tables and coach packets. Opens sign-up on the college coach step; access is instant, reviewed after.",
  },
  {
    key: "claim-your-profile",
    title: "Claim your profile (any athlete)",
    url: "https://www.ncwrestlingunited.com/create-profile",
    use: "For wrestlers and parents, boys or girls. Create a free account, then find and claim the profile (or create one).",
  },
  {
    key: "super32-hq",
    title: "Super 32 HQ",
    url: "https://www.ncwrestlingunited.com/super32/live",
    use: "Signs and slides at Super 32: every NC result live, Huge and Big wins, My Wrestlers.",
  },
  {
    key: "super32-hq-womens",
    title: "Super 32 HQ — Women",
    url: "https://www.ncwrestlingunited.com/super32/live?g=w",
    use: "For the girls' side: opens Super 32 HQ on the Women tab.",
  },
  {
    key: "app-download",
    title: "NC United iPhone app",
    url: "https://apps.apple.com/app/id6803202791",
    use: "Anywhere people are on a computer or looking at paper: flyers, programs, desktop pages.",
  },
]

const NAVY = "#0b1730"

function CodeCard({ c }: { c: ShareCode }) {
  const [png, setPng] = useState<string | null>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    const opts = { margin: 2, errorCorrectionLevel: "H" as const, color: { dark: NAVY, light: "#ffffff" } }
    void QRCode.toDataURL(c.url, { ...opts, width: 1200 }).then(setPng)
    void QRCode.toString(c.url, { ...opts, type: "svg" }).then((s) => setSvg(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`))
  }, [c.url])
  const copy = async () => {
    try { await navigator.clipboard.writeText(c.url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* clipboard blocked */ }
  }
  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mx-auto aspect-square w-full max-w-[220px] rounded-lg border border-gray-100 bg-white p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {png ? <img src={png} alt={`QR code: ${c.title}`} className="h-full w-full" /> : <div className="h-full w-full animate-pulse rounded bg-gray-100" />}
      </div>
      <h2 className="mt-3 text-base font-bold text-[#003366]">{c.title}</h2>
      <p className="mt-1 text-sm text-gray-600">{c.use}</p>
      <button onClick={copy} className="mt-2 truncate rounded bg-gray-50 px-2 py-1 text-left font-mono text-xs text-gray-700 hover:bg-gray-100" title="Copy link">
        {copied ? "Copied" : c.url}
      </button>
      <div className="mt-3 flex gap-2">
        <a href={png ?? undefined} download={`${c.key}-qr.png`} className="flex-1 rounded-md bg-[#003366] py-2 text-center text-sm font-semibold text-white">PNG</a>
        <a href={svg ?? undefined} download={`${c.key}-qr.svg`} className="flex-1 rounded-md border border-[#003366] py-2 text-center text-sm font-semibold text-[#003366]">SVG</a>
      </div>
    </div>
  )
}

export default function ShareCodesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[#003366]">Share codes</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-600">
        QR codes for events, slides and print. PNG for screens and normal printing; SVG stays sharp at any size. To share one
        over text, send the link instead: a QR on a phone can&apos;t be scanned by the same phone.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {CODES.map((c) => <CodeCard key={c.key} c={c} />)}
      </div>
    </div>
  )
}
