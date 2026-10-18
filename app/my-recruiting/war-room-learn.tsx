import { BookOpen, CalendarDays, ChevronRight, DollarSign, FileText, HelpCircle, MapPin, Scale, Sparkles, Trophy } from "lucide-react"

import { LEARN_PAGES, learnPage, sectionId } from "@/lib/recruiting/learn/content"
import { GRADE_NAME, gradeFromLabel, timelineFor, type Grade } from "@/lib/recruiting/learn/timeline"

/**
 * Learn, in the Command Center itself (Matt, 13 Oct 2026: "we should have all of this in the
 * portal"). A family should see the questions and this year's plan here, not a row of links to
 * go and find them.
 *
 * Everything listed is read from the library (lib/recruiting/learn): the questions are the
 * question page's own headings and the levels are its pages, so a question or page added there
 * appears here the same day. Nothing is written twice.
 */
const card = "rounded-xl border border-white/10 bg-[#0f1c2e] p-5"
const eyebrow = "flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#D3B574]"

const MORE = [
  { icon: BookOpen, title: "How wrestling recruiting works", href: "/recruiting" },
  { icon: Trophy, title: "The tournaments college coaches watch: men's and women's", href: "/recruiting/learn/tournaments" },
  { icon: MapPin, title: "Every college program, on a map", href: "/recruiting/college-map" },
  { icon: FileText, title: "What a coach sees: a sample scouting report", href: "/sample-scouting-report" },
] as const

function QuestionList({ slug, icon: Icon }: { slug: string; icon: typeof HelpCircle }) {
  const page = learnPage(slug)
  if (!page) return null
  return (
    <div className={card}>
      <p className={eyebrow}>
        <Icon className="h-4 w-4" aria-hidden /> {page.title}
      </p>
      <ul className="mt-2 divide-y divide-white/10">
        {page.sections.map((section) => (
          <li key={section.heading}>
            <a
              href={`/recruiting/learn/${page.slug}#${sectionId(section.heading)}`}
              className="flex items-start gap-2 py-2.5 text-sm font-semibold leading-5 text-white/90 hover:text-[#D3B574]"
            >
              <span className="min-w-0 flex-1">{section.heading}</span>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-white/30" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function WarRoomLearn({ wrestlers, showYear = true }: { wrestlers: Array<{ firstName: string; grade: string | null }>; showYear?: boolean }) {
  // One card per grade the family has a wrestler in; the oldest leads.
  const years = new Map<Grade, string[]>()
  for (const w of wrestlers) {
    const grade = gradeFromLabel(w.grade)
    if (grade) years.set(grade, [...(years.get(grade) ?? []), w.firstName])
  }
  const thisYear = [...years.entries()].sort((a, b) => b[0] - a[0])
  const levels = LEARN_PAGES.filter((p) => !["questions-families-ask", "paying-for-college"].includes(p.slug))

  return (
    <div className="mt-5 space-y-4">
      {(showYear ? thisYear : []).map(([grade, names]) => {
        const year = timelineFor(grade)
        return (
          <div key={grade} className={`${card} border-[#D3B574]/50`}>
            <p className={eyebrow}>
              <CalendarDays className="h-4 w-4" aria-hidden /> This year for {names.join(" and ")}: {GRADE_NAME[grade].toLowerCase()}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/80">{year.headline}</p>
            <ol className="mt-3 space-y-2">
              {year.steps.slice(0, 3).map((step, i) => (
                <li key={step.text} className="flex gap-3 text-sm leading-6 text-white/85">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-black text-white/70">
                    {i + 1}
                  </span>
                  <span>{step.text}</span>
                </li>
              ))}
            </ol>
            <a href={`/recruiting/learn/timeline#grade-${grade}`} className="mt-3 inline-block text-sm font-bold text-[#D3B574] hover:underline">
              The full year, with the dates coaches may first call and visit →
            </a>
          </div>
        )
      })}

      {showYear && thisYear.length === 0 ? (
        <a href="/recruiting/learn/timeline" className={`${card} flex items-start gap-3 hover:border-[#D3B574]/60`}>
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-[#D3B574]" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-white">Your timeline, grade by grade</span>
            <span className="mt-0.5 block text-sm leading-5 text-white/60">What to do each year, from eighth grade to signing.</span>
          </span>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-white/30" aria-hidden />
        </a>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <QuestionList slug="questions-families-ask" icon={HelpCircle} />
        <QuestionList slug="paying-for-college" icon={DollarSign} />
      </div>

      <div className={card}>
        <p className={eyebrow}>
          <Scale className="h-4 w-4" aria-hidden /> The rules, level by level
        </p>
        <p className="mt-2 text-sm leading-6 text-white/65">
          Contact dates, visits, signing, scholarships and eligibility for men&apos;s and women&apos;s wrestling, each rule with its source.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {levels.map((page) => (
            <a
              key={page.slug}
              href={`/recruiting/learn/${page.slug}`}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/85 hover:border-[#D3B574]/60 hover:text-white"
            >
              {page.title}
            </a>
          ))}
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {MORE.map(({ icon: Icon, title, href }) => (
          <li key={title}>
            <a href={href} className="flex h-full items-center gap-3 rounded-xl border border-white/10 bg-[#0f1c2e] p-4 hover:border-[#D3B574]/60">
              <Icon className="h-5 w-5 shrink-0 text-[#D3B574]" aria-hidden />
              <span className="min-w-0 flex-1 text-sm font-bold text-white">{title}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/30" aria-hidden />
            </a>
          </li>
        ))}
      </ul>

      <p className="flex items-start gap-2 text-xs leading-5 text-white/45">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D3B574]" aria-hidden />
        Ask Scout about colleges: &quot;Which D2 programs in Virginia have room at my weight?&quot; &quot;Who coaches at Campbell?&quot;{" "}
        <a href="/my-recruiting/scout" className="font-semibold text-[#D3B574] hover:underline">
          Open Scout
        </a>
      </p>
    </div>
  )
}
