import { TocPatrioticBar, TocVarsityHeading } from "@/components/toc/toc-theme"
import { TocWeighInCallout } from "@/components/toc/toc-weigh-in-callout"
import { TOC_SCHEDULE } from "@/lib/toc/constants"
import { HardLink } from "@/components/hard-link"

function DayTable({
  title,
  subtitle,
  rows,
}: {
  title: string
  subtitle: string
  rows: readonly { time: string; activity: string }[]
}) {
  return (
    <div className="rounded-sm border-2 border-[#0B1D3A]/10 overflow-hidden bg-white">
      <div className="bg-[#0B1D3A] px-4 py-3 border-b-2 border-[#CC0000]">
        <h3 className="font-bold text-white uppercase tracking-wide text-sm">{title}</h3>
        <p className="text-white/65 text-xs mt-0.5 leading-relaxed">{subtitle}</p>
      </div>

      <ul className="md:hidden divide-y divide-[#0B1D3A]/8 list-none p-0 m-0">
        {rows.map((row) => (
          <li key={row.time + row.activity} className="px-4 py-3.5">
            <p className="font-semibold text-[#0B1D3A] text-sm tabular-nums">{row.time}</p>
            <p className="text-[#0B1D3A]/85 text-sm mt-1 leading-relaxed">{row.activity}</p>
          </li>
        ))}
      </ul>

      <table className="hidden md:table w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.time + row.activity} className="border-t border-[#0B1D3A]/8">
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#0B1D3A] tabular-nums align-top w-36">
                {row.time}
              </td>
              <td className="px-4 py-3 text-[#0B1D3A]/85 leading-relaxed">{row.activity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TocScheduleTable() {
  const { announcements, friday, saturday, lead } = TOC_SCHEDULE

  return (
    <section id="schedule" className="py-12 sm:py-16 md:py-20 bg-[#f4f5f7] scroll-mt-20">
      <div className="container mx-auto w-full px-4 sm:px-6 max-w-4xl">
        <TocVarsityHeading as="h2" className="mb-2 text-center">
          {TOC_SCHEDULE.headline}
        </TocVarsityHeading>
        <p className="text-center text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-1">
          {lead}
        </p>
        <div className="mb-8 sm:mb-10">
          <DayTable
            title={announcements.title}
            subtitle={announcements.subtitle}
            rows={announcements.rows}
          />
        </div>
        <TocWeighInCallout className="mb-8 sm:mb-10 max-w-2xl mx-auto" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <DayTable title={friday.title} subtitle={friday.subtitle} rows={friday.rows} />
          <DayTable title={saturday.title} subtitle={saturday.subtitle} rows={saturday.rows} />
        </div>
        {/* This section is the logistics timeline. Families asking "when is he on?" want the rounds. */}
        <p className="mt-8 text-center text-sm sm:text-base">
          <HardLink
            href="/tournament-of-champions/schedule"
            className="font-bold text-[#0B1D3A] underline underline-offset-4 hover:text-[#CC0000]"
          >
            See the round-by-round schedule →
          </HardLink>
        </p>
      </div>
      <TocPatrioticBar className="mt-10 sm:mt-12" />
    </section>
  )
}
