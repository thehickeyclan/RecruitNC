import type { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"

/**
 * The permanent home of the printed QR code.
 *
 * Lanyards, posters and signage outlive any decision made today, so the code points here rather
 * than at a store listing: this page can change where it sends people without anything being
 * reprinted. iPhones go straight to the App Store; everyone else gets told the truth rather than
 * a dead end, because the app is iOS-only for now.
 *
 * The iPhone redirect itself lives in middleware, so it lands as a real 307 before anything
 * renders. Doing it here streamed the fallback page first and a scan flashed the wrong message
 * on its way to the App Store.
 */

export const dynamic = "force-dynamic"

const APP_STORE_URL = "https://apps.apple.com/app/id6803202791"

export const metadata: Metadata = {
  title: "Get the NC United app",
  description:
    "The Tournament of Champions field, your own bracket, rankings and commitments — the NC United app for iPhone.",
}

export default async function DownloadPage() {
  const userAgent = (await headers()).get("user-agent") ?? ""

  const isAndroid = /Android/i.test(userAgent)

  return (
    <main className="min-h-screen bg-[#0A1628] px-6 py-16 text-white">
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D3B574]">NC Wrestling United</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">
          {isAndroid ? "The app is on iPhone first" : "Get the NC United app"}
        </h1>

        <p className="mt-4 text-base leading-relaxed text-[#A8BBD1]">
          {isAndroid
            ? "We have not built the Android version yet. Everything except the bracket builder works on this site in the meantime, and Android is coming."
            : "See the Tournament of Champions field, build your own bracket, and follow rankings and commitments."}
        </p>

        {!isAndroid ? (
          <a
            href={APP_STORE_URL}
            className="mt-8 w-full rounded-xl bg-[#D3B574] px-6 py-4 text-base font-bold text-[#0A1628]"
          >
            Download on the App Store
          </a>
        ) : null}

        <Link
          href="/tournament-of-champions"
          className="mt-4 w-full rounded-xl border border-[#1a3a5f] px-6 py-4 text-base font-semibold text-white"
        >
          Tournament of Champions
        </Link>

        <p className="mt-8 text-sm text-[#6B829D]">
          {isAndroid ? "iPhone or iPad? " : "On a computer? "}
          <a href={APP_STORE_URL} className="underline">
            Open the App Store listing
          </a>
        </p>
      </div>
    </main>
  )
}
