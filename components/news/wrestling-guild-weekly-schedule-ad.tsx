import Image from "next/image"
import { ExternalLink } from "lucide-react"

const GUILD_URL = "https://www.wrestlingguild.com"
const GUILD_LOGO = "/images/sponsors/the-guild-logo.png"

/** Update weekly — small group sessions shown on Guild marketing. */
const GUILD_WEEK_LABEL = "June 17–21, 2026"

const GUILD_WEEKLY_SESSIONS = [
  { coach: "Luke Simcox", day: "Wed · June 17", time: "6:00 PM", school: "UNC" },
  { coach: "Liam Hickey", day: "Thu · June 18", time: "6:00 PM", school: "NC State" },
  { coach: "Will Denny", day: "Fri · June 19", time: "6:00 PM", school: "NC State" },
  { coach: "Colton Palmer", day: "Sat · June 20", time: "10:00 AM", school: "RAW OG" },
  { coach: "Colton Palmer", day: "Sat · June 20", time: "11:00 AM", school: "RAW OG" },
  { coach: "Nick O'Neill", day: "Sun · June 21", time: "11:30 AM", school: "UNC" },
  { coach: "Cameron Stinson Jr.", day: "Sun · June 21", time: "11:45 AM", school: "UNC" },
] as const

/** Compact Wrestling Guild promo — logo + this week's small-group schedule. */
export function WrestlingGuildWeeklyScheduleAd({ className }: { className?: string }) {
  return (
    <aside
      className={[
        "not-prose my-8 overflow-hidden rounded-xl border border-slate-800 bg-[#0a0a0a] shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="The Wrestling Guild — small group schedule"
    >
      <a
        href={GUILD_URL}
        rel="noopener noreferrer"
        className="group block p-4 sm:p-5 transition-colors hover:bg-[#111]"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
            <Image
              src={GUILD_LOGO}
              alt="The Wrestling Guild"
              width={160}
              height={160}
              className="h-16 w-16 object-contain sm:h-20 sm:w-20"
            />
            <div>
              <p className="text-sm font-bold text-[#D3B574] group-hover:underline">The Wrestling Guild</p>
              <p className="text-xs text-white/50">wrestlingguild.com</p>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#B31B1B]">
                Small group schedule · This week
              </p>
              <p className="text-[11px] text-white/45">{GUILD_WEEK_LABEL}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[280px] border-collapse text-left text-[11px] sm:text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/45">
                    <th className="py-1.5 pr-2 font-semibold">Coach</th>
                    <th className="py-1.5 pr-2 font-semibold">Day</th>
                    <th className="py-1.5 pr-2 font-semibold whitespace-nowrap">Time</th>
                    <th className="py-1.5 font-semibold">School</th>
                  </tr>
                </thead>
                <tbody className="text-white/85">
                  {GUILD_WEEKLY_SESSIONS.map((row) => (
                    <tr key={`${row.coach}-${row.day}-${row.time}`} className="border-b border-white/5 last:border-0">
                      <td className="py-1.5 pr-2 font-medium text-white/90">{row.coach}</td>
                      <td className="py-1.5 pr-2 whitespace-nowrap">{row.day}</td>
                      <td className="py-1.5 pr-2 whitespace-nowrap tabular-nums">{row.time}</td>
                      <td className="py-1.5">{row.school}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#D3B574] group-hover:underline">
              Book at wrestlingguild.com
              <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
            </p>
          </div>
        </div>
      </a>
    </aside>
  )
}
