import Image from "next/image"
import Link from "next/link"

const allAmericans = [
  ["faith-bane.png", "Faith Bane", "Junior 145 lbs", "5th place", "Bane reached the semifinals and earned All-America honors through resilience and strong freestyle technique."],
  ["savada-kitchen.png", "Savada Kitchen", "16U 207 lbs", "8th place", "Kitchen battled onto the podium and established herself among the nation's leading 16U wrestlers at her weight."],
] as const

export function TeamNorthCarolinaWomenFargo2025Part3Content() {
  return (
    <div className="space-y-10">
      <section><p>Team North Carolina&apos;s women made history at the 2025 USMC Nationals in Fargo, competing with skill and heart while demonstrating the growing strength of women&apos;s wrestling across the state.</p><p>Faith Bane and Savada Kitchen earned All-America honors, giving North Carolina two podium finishes across the Junior and 16U divisions.</p></section>

      <section><h2>Two Fargo All-Americans</h2><div className="not-prose grid gap-5 md:grid-cols-2">{allAmericans.map(([src, name, division, place, detail]) => <article key={name} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><div className="relative aspect-[4/5]"><Image src={`/images/news/legacy/team-nc-women-fargo-2025-part-3/${src}`} alt={`${name} competing for Team North Carolina at Fargo`} fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" /></div><div className="p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-bold text-[#13294B]">{name}</h3><span className="rounded-full bg-[#D3B574] px-3 py-1 text-xs font-black text-[#13294B]">{place}</span></div><p className="mt-2 text-sm font-semibold text-slate-900">{division}</p><p className="mt-2 text-sm leading-6 text-slate-700">{detail}</p></div></article>)}</div></section>

      <section><h2>Participation defined the next opportunity</h2><p>North Carolina brought 14 women across two divisions. Illinois brought 144. That disparity showed how participation influenced the size of each state&apos;s talent pool, the intensity of internal competition and ultimately its podium potential.</p><div className="not-prose grid grid-cols-2 gap-3 text-center"><div className="rounded-xl bg-[#13294B] p-5 text-white"><div className="text-3xl font-black">14</div><div className="text-xs uppercase tracking-wider">Team NC entries</div></div><div className="rounded-xl bg-[#13294B] p-5 text-white"><div className="text-3xl font-black">144</div><div className="text-xs uppercase tracking-wider">Illinois entries</div></div></div></section>

      <section><h2>Freestyle was essential</h2><p>For North Carolina women with national goals and collegiate aspirations, Fargo was more than another tournament. Freestyle is the collegiate style for women, making early and consistent participation vital to long-term success.</p><p>The pathway was clear: more girls wrestling freestyle, more often, with access to national competition and college-level goals. Greater participation would create stronger practice rooms, deeper state competition and more North Carolina athletes prepared to reach Fargo podiums.</p></section>

      <section><h2>The future remained bright</h2><p>Fargo provided a demanding benchmark and a clear picture of the work ahead. Team North Carolina left proud of its effort and committed to building with greater intention, technical knowledge, experience and consistency.</p><p><Link href="/news/moving-forward-future-bright-nc-wrestling-part-4">Continue to Part 4: Moving Forward—The Future Is Bright for NC Wrestling</Link></p></section>
    </div>
  )
}
