import { SOURCES, type GenderComparison } from "@/lib/recruiting/learn/content"

/** The first card on a level page: where men's and women's wrestling differ there, and where they do not. */
export function MensAndWomens({ comparison, focus }: { comparison: GenderComparison; focus?: { gender: "mens" | "womens"; names: string[] } | null }) {
  const { differences, same, note, sources } = comparison
  // The family's own wrestler leads: a daughter's family reads the women's rule first, marked as hers.
  const order: Array<"mens" | "womens"> = focus?.gender === "womens" ? ["womens", "mens"] : ["mens", "womens"]
  const label = (side: "mens" | "womens") => {
    const base = side === "mens" ? "Men" : "Women"
    if (!focus) return base
    return side === focus.gender ? `${base}${focus.names.length > 0 ? `: ${focus.names.join(" and ")}` : ""}` : `${base}, for comparison`
  }
  return (
    <section id="mens-and-womens" className="scroll-mt-24 rounded-xl border border-[#D3B574]/40 bg-[#0f1c2e] p-5">
      <h2 className="text-lg font-black tracking-tight text-white">Men&apos;s and women&apos;s wrestling: what differs here</h2>

      {differences.length > 0 ? (
        <div className="mt-3 divide-y divide-white/10">
          {differences.map((d) => (
            <div key={d.topic} className="py-3">
              <p className="text-sm font-bold text-white">{d.topic}</p>
              <dl className="mt-1.5 grid gap-2 sm:grid-cols-2 sm:gap-4">
                {order.map((side) => {
                  const theirs = !focus || side === focus.gender
                  return (
                    <div key={side}>
                      <dt className={`text-[11px] font-black uppercase tracking-widest ${theirs ? "text-[#D3B574]" : "text-white/40"}`}>{label(side)}</dt>
                      <dd className={`text-sm leading-6 ${theirs ? (focus ? "font-semibold text-white" : "text-white/85") : "text-white/50"}`}>{d[side]}</dd>
                    </div>
                  )
                })}
              </dl>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm leading-6 text-white/80">We found no rule at this level that differs between men&apos;s and women&apos;s wrestling.</p>
      )}

      {same.length > 0 ? (
        <>
          <p className="mt-3 text-[11px] font-black uppercase tracking-widest text-white/50">The same for both</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-white/70 marker:text-white/30">
            {same.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      ) : null}

      {note ? <p className="mt-3 rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100">{note}</p> : null}

      <p className="mt-3 text-xs leading-5 text-white/40">
        Everything else on this page applies to both unless it says men&apos;s or women&apos;s. Source:{" "}
        {sources.map((key, i) => (
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
