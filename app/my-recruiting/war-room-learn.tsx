import { BookOpen, CalendarDays, HelpCircle, ChevronRight, FileText, MapPin, Scale, ShieldAlert, Sparkles, Trophy } from "lucide-react"

/**
 * Learn: what exists today, in the order a family needs it. Only finished material is listed -
 * the level-by-level rules and contact dates join when they have been checked against the NCAA,
 * NAIA and NJCAA manuals, not before.
 */
const LESSONS = [
  {
    icon: CalendarDays,
    title: "Your timeline, grade by grade",
    text: "What to do this year, from eighth grade to signing, and the dates each level of coach may first call, meet and host your wrestler.",
    href: "/recruiting/learn/timeline",
  },
  {
    icon: HelpCircle,
    title: "Questions families ask",
    text: "Who pays for a visit, do parents go, what NIL and revenue sharing are, a grant against a scholarship, and the Ivy League.",
    href: "/recruiting/learn/questions-families-ask",
  },
  {
    icon: Scale,
    title: "The rules, level by level",
    text: "When a coach can contact you, visits, signing, scholarships and eligibility for D1, D2, D3, NAIA and junior college. Every rule with its source.",
    href: "/recruiting/learn",
  },
  {
    icon: ShieldAlert,
    title: "Staying eligible in North Carolina",
    text: "Prize money the NCAA allows can still end a high school season here. And how NIL works for NC athletes.",
    href: "/recruiting/learn/staying-eligible-in-north-carolina",
  },
  {
    icon: BookOpen,
    title: "How wrestling recruiting works",
    text: "The levels, how many wrestlers compete at each, scholarships and what coaches look for.",
    href: "/recruiting",
  },
  {
    icon: Trophy,
    title: "The tournaments coaches watch",
    text: "Which events put a wrestler in front of college staff, and what each one is worth.",
    href: "/recruiting/tournaments",
  },
  {
    icon: MapPin,
    title: "Every college program, on a map",
    text: "Every school by level, with its coaches and recruiting questionnaire. Save the ones you're aiming at.",
    href: "/recruiting/college-map",
  },
  {
    icon: FileText,
    title: "What a coach sees",
    text: "A sample of the scouting report college coaches read on a RecruitNC wrestler.",
    href: "/sample-scouting-report",
  },
  {
    icon: Sparkles,
    title: "Ask Data Dawg",
    text: "\"How many D2 programs are in Pennsylvania?\" \"Who is the head coach at Campbell?\" Tap the dog, bottom right.",
    href: null,
  },
] as const

export function WarRoomLearn() {
  return (
    <ul className="mt-5 grid gap-3 sm:grid-cols-2">
      {LESSONS.map(({ icon: Icon, title, text, href }) => {
        const body = (
          <>
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#D3B574]" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-white">{title}</span>
              <span className="mt-0.5 block text-sm leading-5 text-white/60">{text}</span>
            </span>
            {href ? <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-white/30" aria-hidden /> : null}
          </>
        )
        const frame = "flex h-full items-start gap-3 rounded-xl border border-white/10 bg-[#0f1c2e] p-4"
        return (
          <li key={title}>
            {href ? (
              <a href={href} className={`${frame} hover:border-[#D3B574]/60`}>
                {body}
              </a>
            ) : (
              <div className={frame}>{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
