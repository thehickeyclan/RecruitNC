/**
 * RecruitWrestlers' News (Matt, 26 Oct 2026: "model news after nc united pages.. much nicer"):
 * NC United's News layout - hero, featured story, "More stories" grid - in RecruitWrestlers' navy
 * and lime, carrying every state's stories. recruitwrestlers.com addresses only; NC United has
 * its own News. The address stays /recaps (NC United owns /news); the menu calls it News.
 */
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { ArrowRight, Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { RW_STORIES, type Story } from "@/lib/recruitwrestlers-news"

export const dynamic = "force-dynamic"

const isRwHost = (host: string) => /recruitwrestlers\.com$|^localhost|\.vercel\.app$/.test(host.toLowerCase())

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? ""
  if (!isRwHost(host)) return { title: { absolute: "Page not found" }, robots: { index: false, follow: false } }
  return {
    title: { absolute: "News | RecruitWrestlers" },
    description: "Tournament recaps and recruiting news from RecruitWrestlers, state by state.",
  }
}

const dateLong = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
const dateShort = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

/** A story without a photo: its title on navy with a lime rule. */
function LetteredTile({ title }: { title: string }) {
  const [head, tail] = title.split(": ")
  return (
    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-br from-[#1b2d49] via-[#11203A] to-[#0B1426] p-6 md:p-8">
      <span className="mb-3 h-1 w-12 rounded bg-[#A3E635]" />
      <p className="text-2xl font-black leading-tight text-white md:text-4xl">{head}</p>
      {tail ? <p className="mt-2 text-base font-semibold text-white/70 md:text-lg">{tail}</p> : null}
    </div>
  )
}

function Pills({ s, draft }: { s: Story; draft: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="rounded-full bg-[#A3E635] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-[#0B1426]">{s.category}</span>
      {s.state !== "All" ? <span className="rounded-full border border-white/25 px-2.5 py-0.5 text-xs font-bold text-white">{s.state}</span> : null}
      {s.premium ? <span className="rounded-full border border-[#A3E635] px-2.5 py-0.5 text-xs font-semibold text-[#A3E635]">★ Premium content</span> : null}
      {draft ? <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold text-amber-200">Draft · staff only</span> : null}
    </div>
  )
}

export default async function RecruitWrestlersNews() {
  if (!isRwHost((await headers()).get("host") ?? "")) notFound()
  const { viewer } = await resolveRankingViewer({ supabase: await createClient(), admin: createAdminClient() })
  const isAdmin = viewer.isAdmin === true
  const stories = RW_STORIES.filter((s) => s.published || isAdmin)
  const [featured, ...rest] = stories

  return (
    <div className="min-h-screen bg-[#0B1426]">
      <header className="border-b border-white/10 bg-gradient-to-br from-[#15243B] via-[#11203A] to-[#0B1426]">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A3E635]">RecruitWrestlers</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-5xl lg:text-6xl">News</h1>
          <p className="mt-4 max-w-2xl text-lg text-[#A8B3C5]">
            Tournament recaps and recruiting news, state by state. Every wrestler graded on who they beat, how far they went and who beat them.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/membership" className="inline-flex rounded-xl bg-[#A3E635] px-5 py-3 text-sm font-bold text-[#0B1426] hover:bg-[#BEF264]">
              Join Insider for full recaps
            </Link>
            <Link href="/auth/signup" className="inline-flex rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white hover:border-[#A3E635] hover:text-[#A3E635]">
              Create a free account
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-16">
        {featured ? (
          <section className="mb-16">
            <Link
              href={featured.href}
              className="group block overflow-hidden rounded-2xl border border-white/10 bg-[#15243B] transition-all duration-300 hover:border-[#A3E635]/50 hover:shadow-xl hover:shadow-[#A3E635]/5"
            >
              <div className="grid gap-0 md:grid-cols-2">
                <div className="relative aspect-[16/10] overflow-hidden bg-[#11203A] md:aspect-auto md:min-h-[400px]">
                  {featured.image ? (
                    <Image src={featured.image} alt="" fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover object-center transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <LetteredTile title={featured.title} />
                  )}
                </div>
                <div className="flex flex-col justify-center p-6 md:p-10">
                  <div className="mb-4 flex items-center gap-3">
                    <Pills s={featured} draft={!featured.published} />
                    <span className="text-sm uppercase tracking-wide text-white/50">Featured</span>
                  </div>
                  <h2 className="text-2xl font-bold leading-tight text-white transition-colors group-hover:text-[#A3E635] md:text-3xl lg:text-4xl">{featured.title}</h2>
                  <p className="mt-4 line-clamp-3 text-base leading-relaxed text-[#A8B3C5] md:text-lg">{featured.summary}</p>
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-white/50">
                      <Calendar className="h-4 w-4" />
                      {dateLong(featured.date)} · {featured.readTime}
                    </div>
                    <span className="inline-flex items-center gap-2 font-medium text-[#A3E635] transition-all group-hover:gap-3">
                      {/recap/i.test(featured.title) ? "Read the recap" : "Read the article"}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </section>
        ) : null}

        {rest.length > 0 ? (
          <section>
            <h2 className="mb-8 text-sm font-semibold uppercase tracking-widest text-white/40">More stories</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((s) => (
                <Link key={s.href} href={s.href} className="group block overflow-hidden rounded-xl border border-white/10 bg-[#15243B]/60 transition-all duration-300 hover:border-[#A3E635]/40 hover:bg-[#15243B]">
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#11203A]">
                    {s.image ? (
                      <Image src={s.image} alt="" fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover object-center transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <LetteredTile title={s.title} />
                    )}
                  </div>
                  <div className="p-5">
                    <div className="mb-3">
                      <Pills s={s} draft={!s.published} />
                    </div>
                    <h3 className="line-clamp-2 font-semibold leading-snug text-white transition-colors group-hover:text-[#A3E635]">{s.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-[#A8B3C5]">{s.summary}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-white/40">
                      <span>{dateShort(s.date)}</span>
                      <span>{s.readTime}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {stories.length === 0 ? <p className="py-16 text-center text-white/50">No stories yet.</p> : null}
      </main>
    </div>
  )
}
