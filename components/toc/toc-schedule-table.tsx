import { TocPatrioticBar, TocVarsityHeading } from "@/components/toc/toc-theme"
import { TOC_MATS_LINE } from "@/lib/toc/constants"

const FRIDAY = [
  { time: "3:00–5:00 PM", activity: "Weigh-in & skin check (all wrestlers)" },
  { time: "5:45 PM", activity: "Doors open (ticket holders)" },
  { time: "6:00 PM", activity: "National anthem & invocation" },
  { time: "6:10 PM", activity: "Opening round — quarterfinals (2 mats)" },
  { time: "~9:20 PM", activity: "Friday session concludes" },
] as const

const SATURDAY = [
  { time: "7:00 AM", activity: "Doors open" },
  { time: "8:50 AM", activity: "National anthem & invocation" },
  { time: "9:00 AM", activity: "Semifinals, consolation & placement bouts (2 mats)" },
  { time: "~4:00 PM", activity: "Preliminary & placement bouts complete" },
  { time: "4:00–5:00 PM", activity: "Break — championship mat setup" },
  { time: "5:00 PM", activity: "Parade of finalists & introductions" },
  { time: "5:15 PM", activity: "Championship finals — one mat, all 11 weights" },
  { time: "~7:30 PM", activity: "Finals & awards" },
] as const

function DayTable({ title, subtitle, rows }: { title: string; subtitle: string; rows: readonly { time: string; activity: string }[] }) {
  return (
    <div className="rounded-sm border-2 border-[#0B1D3A]/10 overflow-hidden bg-white">
      <div className="bg-[#0B1D3A] px-4 py-3 border-b-2 border-[#CC0000]">
        <h3 className="font-bold text-white uppercase tracking-wide text-sm">{title}</h3>
        <p className="text-white/65 text-xs mt-0.5">{subtitle}</p>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.time + row.activity} className="border-t border-[#0B1D3A]/8">
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#0B1D3A] tabular-nums align-top w-[7.5rem] sm:w-36">
                {row.time}
              </td>
              <td className="px-4 py-3 text-[#0B1D3A]/85">{row.activity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TocScheduleTable() {
  return (
    <section id="schedule" className="py-16 md:py-20 bg-[#f4f5f7] scroll-mt-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <TocVarsityHeading as="h2" className="text-4xl md:text-5xl mb-2 text-center">
          When to be there
        </TocVarsityHeading>
        <p className="text-center text-muted-foreground mb-3 max-w-2xl mx-auto">
          {TOC_MATS_LINE} Championship-level production — not another all-day grind.
        </p>
        <p className="text-center text-muted-foreground text-sm mb-10 max-w-2xl mx-auto">
          Wrestler check-in begins 3:00 PM Friday. Public doors open 5:45 PM for ticket holders.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <DayTable title="Friday · September 4" subtitle="Opening round — brackets go live" rows={FRIDAY} />
          <DayTable title="Saturday · September 5" subtitle="Placement bouts & championship finals" rows={SATURDAY} />
        </div>
      </div>
      <TocPatrioticBar className="mt-12" />
    </section>
  )
}
