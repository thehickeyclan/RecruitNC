import type { Metadata } from "next"
import Image from "next/image"
import { CalendarDays, MapPin, Users } from "lucide-react"
import { WeekendWarsRsvpForm } from "@/components/weekend-wars-rsvp-form"
import { WEEKEND_WARS_EVENT } from "@/lib/weekend-wars"

export const metadata: Metadata = {
  title: "Weekend Wars RSVP | NC United Wrestling",
  description: "RecruitNC athletes can RSVP for the August 29–30 Weekend Wars and Super 32 Prep Series at Darkhorse Wrestling.",
}

export default function WeekendWarsPage() {
  return (
    <main className="min-h-screen bg-[#061427] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(211,181,116,0.14),_transparent_38%)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[0.82fr_1.18fr] md:items-center md:py-16">
          <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl">
            <Image
              src="/images/events/weekend-wars-super32-prep.png"
              alt="Weekend Wars and Super 32 Prep Series event flyer"
              width={988}
              height={1238}
              className="h-auto w-full"
              priority
            />
          </div>

          <div>
            <div className="mb-7 flex items-center gap-4 rounded-xl border border-white/10 bg-black/35 p-4 sm:max-w-xl">
              <div className="relative h-16 flex-1 sm:h-20">
                <Image
                  src="/images/events/darkhorse-wrestling-logo.png"
                  alt="Darkhorse Wrestling"
                  fill
                  className="object-contain"
                  sizes="260px"
                />
              </div>
              <div className="h-14 w-px shrink-0 bg-[#F6A313]/50" />
              <div className="relative h-16 w-24 shrink-0 sm:h-20 sm:w-28">
                <Image
                  src="/nc-united-logo-white.png"
                  alt="NC United Wrestling"
                  fill
                  className="object-contain [filter:brightness(0)_saturate(100%)_invert(73%)_sepia(84%)_saturate(1274%)_hue-rotate(348deg)_brightness(103%)_contrast(101%)]"
                  sizes="112px"
                />
              </div>
            </div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#D3B574]">NC United practice RSVP</p>
            <h1 className="mt-3 text-4xl font-black leading-[0.95] sm:text-5xl lg:text-6xl">
              {WEEKEND_WARS_EVENT.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70">
              Let NC United know which practices you plan to attend. Current members receive free admission to the
              Sunday Super 32 prep clinic.
            </p>
            <div className="mt-7 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <CalendarDays className="h-5 w-5 text-[#D3B574]" />
                <p className="mt-2 font-bold">{WEEKEND_WARS_EVENT.saturday.date}</p>
                <p className="mt-1 leading-relaxed text-white/55">{WEEKEND_WARS_EVENT.saturday.detail}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <CalendarDays className="h-5 w-5 text-[#D3B574]" />
                <p className="mt-2 font-bold">{WEEKEND_WARS_EVENT.sunday.date}</p>
                <p className="mt-1 leading-relaxed text-white/55">{WEEKEND_WARS_EVENT.sunday.detail}</p>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/65">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#D3B574]" />
              <span>{WEEKEND_WARS_EVENT.venue} · {WEEKEND_WARS_EVENT.address}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-7 flex items-center gap-3">
          <div className="rounded-lg bg-[#D3B574]/15 p-2.5">
            <Users className="h-6 w-6 text-[#D3B574]" />
          </div>
          <div>
            <h2 className="text-2xl font-black">Member attendance</h2>
            <p className="mt-1 text-sm text-white/55">One RSVP per athlete. Return anytime to update your response.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0B1D3A] p-5 shadow-2xl sm:p-7">
          <WeekendWarsRsvpForm />
        </div>
      </section>
    </main>
  )
}
