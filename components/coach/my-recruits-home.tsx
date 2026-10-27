"use client"

/**
 * My Recruits as the coach's home (Matt, 27 Oct 2026: "having funnel is important on first page
 * they see"): the board and its funnel first, then what needs the coach today, then who to add.
 * The pieces are Coach Home's own (app/coach-home/coach-home-client.tsx); its tool and rankings
 * link cards are left out, the coach menu has them.
 */
import Link from "next/link"
import { ArrowRight, MessageSquare } from "lucide-react"
import { MyRecruitsBoard } from "@/components/my-recruits-board"
import { AlertsPanel, CompetingNextPanel, Super32Notice, TopUncommitted, type CoachHomeData } from "@/app/coach-home/coach-home-client"

function MessagesToAnswer({ data }: { data: CoachHomeData }) {
  const waiting = data.messages.latest.filter((t) => t.yourTurn || t.unread).slice(0, 3)
  if (!waiting.length) return null
  return (
    <section className="mt-4 rounded-xl border border-white/10 bg-[#0f1c2e] p-4" aria-labelledby="mr-msgs">
      <div className="flex items-center justify-between gap-2">
        <h2 id="mr-msgs" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/40">
          <MessageSquare className="h-3.5 w-3.5 text-[#D3B574]" /> Messages to answer
        </h2>
        <Link href="/inbox" className="inline-flex items-center gap-1 text-xs font-bold text-[#D3B574] hover:underline">
          Open inbox <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <ul className="mt-2 space-y-1">
        {waiting.map((t) => (
          <li key={t.id}>
            <Link href={`/inbox/${t.id}`} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.05] hover:text-white">
              <span className="min-w-0 truncate">
                <span className="font-bold text-white">{t.athleteName}</span> <span className="text-white/55">{t.preview}</span>
              </span>
              <span className="shrink-0 text-[10px] font-black uppercase text-white/40">{t.unread ? "New" : "Your turn"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function MyRecruitsHome({ data, viewingAs = null }: { data: CoachHomeData | null; viewingAs?: { userId: string; label: string } | null }) {
  const womens = data?.viewGender === "Female"
  const needsYou = data ? (
    <div className="mt-2">
      <Super32Notice womens={womens} />
      <AlertsPanel data={data} />
      <MessagesToAnswer data={data} />
    </div>
  ) : null
  const below = data ? (
    <div className="mt-8">
      {data.suggested?.length ? <TopUncommitted wrestlers={data.suggested} poolSize={data.athletes.length} womens={womens} /> : null}
      <CompetingNextPanel data={data} />
    </div>
  ) : null
  if (!viewingAs) return <MyRecruitsBoard needsYou={needsYou} below={below} />
  return (
    <>
      <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 border-b border-[#A3E635]/40 bg-[#15243B] px-4 py-2 text-sm text-white">
        <span>
          Viewing as <span className="font-bold">{viewingAs.label}</span> · read-only
        </span>
        <Link href="/admin/view-as-coach" className="font-semibold text-[#A3E635] underline">
          Pick another coach
        </Link>
      </div>
      <MyRecruitsBoard needsYou={needsYou} below={below} asUserId={viewingAs.userId} />
    </>
  )
}
