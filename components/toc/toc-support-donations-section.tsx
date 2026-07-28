"use client"

import Image from "next/image"
import { useState } from "react"
import { Check, Copy, Download, HeartHandshake, QrCode, Share2, ShieldCheck } from "lucide-react"

import { HardLink } from "@/components/hard-link"
import { TOC_SUPPORT_DONATIONS } from "@/lib/toc/constants"
import {
  TocPatrioticBar,
  TocVarsityHeading,
  tocContainerClass,
  tocDisplayClass,
  tocMobileCtaClass,
  tocSectionClass,
} from "@/components/toc/toc-theme"

const icons = [QrCode, HeartHandshake, ShieldCheck] as const

export function TocSupportDonationsSection() {
  const s = TOC_SUPPORT_DONATIONS
  const [copied, setCopied] = useState(false)

  function getShareUrl() {
    if (typeof window === "undefined") return s.href
    return new URL(s.href, window.location.origin).toString()
  }

  async function copyDonationLink() {
    const url = getShareUrl()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt("Copy this donation link:", url)
    }
  }

  async function shareDonationLink() {
    const url = getShareUrl()
    const title = "Support Tournament of Champions"
    const text =
      "Help NC United resource the Tournament of Champions experience — mats, officials, awards, production, hospitality, and event details."

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch {
        // If the native share sheet is cancelled or unavailable, fall back to copy.
      }
    }

    await copyDonationLink()
  }

  return (
    <section id="support-toc" className={`relative overflow-hidden bg-[#061224] text-white scroll-mt-20 ${tocSectionClass()}`}>
      <TocPatrioticBar className="absolute top-0 left-0 right-0" />
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 18%, rgba(200,169,74,0.26), transparent 28%), radial-gradient(circle at 86% 76%, rgba(204,0,0,0.22), transparent 30%)",
        }}
        aria-hidden
      />

      <div className={`${tocContainerClass()} relative pt-4`}>
        <div className="grid gap-8 rounded-2xl border border-[#D7B95A]/30 bg-[#0B1D3A]/65 p-5 shadow-2xl shadow-black/25 sm:p-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
          <div>
            <p className={`mb-2 text-sm text-[#D7B95A] ${tocDisplayClass()}`}>{s.eyebrow}</p>
            <TocVarsityHeading as="h2" className="text-white">
              {s.headline}
            </TocVarsityHeading>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/78 sm:text-lg">{s.lead}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {s.bullets.map((item, index) => {
                const Icon = icons[index] ?? HeartHandshake
                return (
                  <div key={item} className="rounded-xl border border-white/10 bg-white/[0.055] p-4">
                    <Icon className="h-5 w-5 text-[#D7B95A]" aria-hidden />
                    <p className="mt-3 text-sm leading-relaxed text-white/74">{item}</p>
                  </div>
                )
              })}
            </div>

            <p className="mt-5 max-w-3xl text-xs leading-relaxed text-white/50">{s.note}</p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white p-4 text-[#061224] shadow-xl">
            <div className="rounded-xl border border-[#0B1D3A]/10 bg-white p-3">
              <Image
                src={s.qrSrc}
                alt={s.qrAlt}
                width={292}
                height={292}
                className="mx-auto h-auto w-full max-w-[260px]"
              />
            </div>
            <div className="mt-4 text-center">
              <p className={`text-xl text-[#0B1D3A] ${tocDisplayClass()}`}>Scan to support</p>
              <p className="mt-1 text-sm leading-snug text-[#0B1D3A]/70">Tournament resources through NC United</p>
            </div>
            <HardLink href={s.href} className={`mt-4 ${tocMobileCtaClass("primary")}`}>
              {s.ctaLabel}
            </HardLink>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={shareDonationLink}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#0B1D3A]/12 bg-[#0B1D3A] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#122B54]"
              >
                <Share2 className="h-4 w-4" aria-hidden />
                Share
              </button>
              <button
                type="button"
                onClick={copyDonationLink}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#0B1D3A]/12 bg-white px-3 py-2 text-sm font-bold text-[#0B1D3A] transition hover:bg-[#F4F6FA]"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <a
                href={s.qrSrc}
                download="toc-donation-qr.svg"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#0B1D3A]/12 bg-white px-3 py-2 text-sm font-bold text-[#0B1D3A] transition hover:bg-[#F4F6FA]"
              >
                <Download className="h-4 w-4" aria-hidden />
                QR
              </a>
            </div>
            <p className="mt-2 text-center text-xs leading-snug text-[#0B1D3A]/55">
              Share opens the phone share sheet for text, email, AirDrop, and more.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
