import { SOURCES, type LearnSection } from "@/lib/recruiting/learn/content"

/** One section of a rules page: the facts, then where they came from. Used by server and client. */
export function LearnSectionCard({ section }: { section: LearnSection }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#0f1c2e] p-5">
      <h2 className="text-lg font-black tracking-tight text-white">{section.heading}</h2>
      {section.intro ? <p className="mt-2 text-sm leading-6 text-white/70">{section.intro}</p> : null}

      {section.rows ? (
        <dl className="mt-3 divide-y divide-white/10">
          {section.rows.map((row) => (
            <div key={`${row.label}-${row.value}`} className="grid gap-1 py-2.5 sm:grid-cols-[1fr_1.1fr] sm:gap-4">
              <dt className="text-sm text-white/65">{row.label}</dt>
              <dd className="text-sm font-bold text-white">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {section.bullets ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-white/80 marker:text-[#D3B574]">
          {section.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}

      {section.reading ? (
        <p className="mt-3 rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100">
          {section.reading}
        </p>
      ) : null}

      <p className="mt-3 text-xs leading-5 text-white/40">
        Source:{" "}
        {section.sources.map((key, i) => (
          <span key={key}>
            {i > 0 ? "; " : ""}
            <a href={SOURCES[key].url} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/70">
              {SOURCES[key].label}
            </a>
          </span>
        ))}
      </p>
    </section>
  )
}
