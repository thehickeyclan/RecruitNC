import Image from "next/image"
import Link from "next/link"

const internationalResults = [
  ["June 2024", "Gold at 70 kg in the senior and U20 divisions of the Pat Shaw Memorial Tournament in Guatemala City"],
  ["July 2024", "Gold at 70 kg at the U20 Pan American Championships in Lima, Peru"],
  ["April 2025", "Bronze at 74 kg at the U23 Pan American Championships in Querétaro, Mexico"],
  ["August 2025", "Bronze at the Junior Pan American Games in Asunción, Paraguay"],
] as const

export function TylerTracyJuniorPanAmGamesBronze2025Content() {
  return (
    <div className="space-y-10">
      <section>
        <p><strong>ASUNCIÓN, Paraguay — August 27, 2025 —</strong> Tyler Tracy made history at the 2025 Junior Pan American Games, winning bronze and becoming Jamaica&apos;s first wrestling medalist at the event.</p>
        <p>The NC State wrestler and two-time North Carolina state champion added another international milestone to a career connecting his Jamaican heritage with the wrestling community that developed him at home.</p>
      </section>

      <section>
        <h2>A historic moment for Jamaica</h2>
        <p>Tracy&apos;s podium finish placed Jamaica on the Junior Pan American Games wrestling medal table for the first time. It followed his U23 Pan American bronze earlier in 2025 and gold-medal performances in Guatemala and Peru in 2024.</p>
        <figure className="not-prose mt-5 overflow-hidden rounded-xl border border-slate-200 bg-black">
          <Image src="/images/news/legacy/tyler-tracy-junior-pan-am-games-2025/bronze-medal.png" alt="Tyler Tracy wearing Jamaica's flag after winning bronze at the Junior Pan American Games" width={930} height={934} className="h-auto w-full" />
        </figure>
      </section>

      <section>
        <h2>North Carolina roots, international impact</h2>
        <p>Tracy was a two-time state champion at Cardinal Gibbons High School, an NHSCA national finalist and a redshirt sophomore at NC State. His continued rise reflected the dedication and resilience that defined his development in North Carolina.</p>
        <blockquote>“Tyler has a relentless drive to compete at the highest levels of the sport. His work ethic is, and has always been, remarkable. He&apos;s a special athlete and, more importantly, an outstanding person.”<footer>— Brandon Palmer</footer></blockquote>
      </section>

      <section>
        <h2>International résumé</h2>
        <div className="not-prose grid gap-3">
          {internationalResults.map(([date, result]) => (
            <article key={date} className="grid gap-1 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[8rem_1fr]">
              <strong className="text-[#13294B]">{date}</strong><span className="text-slate-700">{result}</span>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Giving back to the next generation</h2>
        <p>Even while balancing college and international competition, Tracy remained connected to the Raleigh Area Wrestling Club and NC United, volunteering in practices and mentoring younger athletes.</p>
        <blockquote>“Tyler represents what NC United is about. In the height of his own journey, he still commits time to coach and mentor athletes from his high school, his home club and NC United.”<footer>— Colton Palmer, NC United Co-Founder and Coach</footer></blockquote>
        <blockquote>“Tyler has made us proud representing NC on the international stage, but he still consistently comes into the RAW room to volunteer, coach and mentor the next generation.”<footer>— Casey Gashaw, Raleigh Area Wrestling Club</footer></blockquote>
      </section>

      <section>
        <h2>Watch Tyler Tracy&apos;s Junior Pan American Games run</h2>
        <div className="not-prose aspect-video overflow-hidden rounded-xl bg-black shadow-lg">
          <iframe className="h-full w-full" src="https://www.youtube-nocookie.com/embed/zMwpvXUgf1U?start=3" title="Tyler Tracy at the 2025 Junior Pan American Games" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
        </div>
      </section>

      <section>
        <h2>Inspiring two wrestling communities</h2>
        <p>For Jamaica, the medal opened a new chapter in the nation&apos;s wrestling history. For North Carolina, it demonstrated what is possible when high-level development is paired with mentorship and a commitment to giving back.</p>
        <p><Link href="/news/tyler-tracy-bronze-jamaica-2025-u23-pan-ams" className="font-bold text-[#13294B] underline decoration-[#D3B574] decoration-2 underline-offset-4">Read about Tracy&apos;s 2025 U23 Pan American bronze medal</Link></p>
      </section>
    </div>
  )
}
