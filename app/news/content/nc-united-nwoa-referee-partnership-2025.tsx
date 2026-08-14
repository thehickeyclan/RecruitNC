import Image from "next/image"

const sponsoredAthletes = [
  ["Bentley Sly", "Stuart Cramer High School"],
  ["Carson Worrick", "Alleghany High School"],
  ["Tobin McNair", "Wakefield High School"],
  ["Sam Harper", "South Iredell High School"],
  ["Luke Richards", "Cardinal Gibbons High School"],
  ["Eli Taylor", "Middle School"],
] as const

export function NcUnitedNwoaRefereePartnership2025Content() {
  return (
    <div className="space-y-10">
      <section><p><strong>NORTH CAROLINA — August 8, 2025 —</strong> NC United Wrestling announced a partnership with the National Wrestling Officials Association to recruit, train and equip the next generation of referees across North Carolina.</p><p>The initiative invested in a critical part of wrestling&apos;s infrastructure as participation continued growing in men&apos;s and women&apos;s divisions and across folkstyle, freestyle and Greco-Roman.</p></section>

      <section><h2>Six athletes sponsored for the Elite Officials Clinic</h2><p>NC United sponsored six student-athletes to attend the Elite Officials Wrestling Clinic on August 23 at William A. Hough High School in Cornelius. They supported live match scenarios while officials worked on scoring, positioning and in-match mechanics.</p><div className="not-prose grid gap-3 sm:grid-cols-2 md:grid-cols-3">{sponsoredAthletes.map(([name, school]) => <article key={name} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-bold text-[#13294B]">{name}</h3><p className="mt-1 text-sm text-slate-600">{school}</p></article>)}</div><figure className="not-prose mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><Image src="/images/news/legacy/nc-united-nwoa-partnership-2025/sponsored-athletes.png" alt="Six NC United athletes sponsored for the 2025 Elite Officials Wrestling Clinic" width={1272} height={1176} className="h-auto w-full" /><figcaption className="p-3 text-sm text-slate-600">The six NC United athletes selected to assist with live clinic scenarios.</figcaption></figure></section>

      <section><h2>A strong sport required strong officials</h2><p>The Elite Officials Clinic attracted referees from across the country, including officials with experience in the Big Ten, Big 12, ACC, Southern Conference and other major collegiate leagues.</p><blockquote>“This partnership is about investing in every layer of wrestling. Recruiting and developing referees ensures the sport continues to grow while giving our athletes a chance to learn, earn, and give back to the community.”<footer>— Matt Hickey, Co-Founder, NC United</footer></blockquote></section>

      <section><h2>A different perspective for athletes</h2><div className="not-prose grid gap-5 md:grid-cols-[0.7fr_1.3fr] md:items-center"><div className="overflow-hidden rounded-xl"><Image src="/images/news/legacy/nc-united-nwoa-partnership-2025/jonathan-sutton.png" alt="Jonathan Sutton officiating a wrestling match" width={778} height={1250} className="h-auto w-full" /></div><blockquote className="m-0">“North Carolina wrestling is growing at every level. We need more referees across all divisions and styles to keep pace. Events like this not only train officials but also give athletes a new perspective that can raise their wrestling IQ and keep them connected to the sport for years to come.”<footer>— Jonathan Sutton, Big 12 official and North Carolina native</footer></blockquote></div></section>

      <section><h2>2025 clinic weekend</h2><div className="not-prose grid gap-4 md:grid-cols-2"><article className="rounded-xl bg-[#13294B] p-6 text-white"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#D3B574]">Saturday · August 23</div><h3 className="mt-2 text-xl font-bold">Elite Officials Wrestling Clinic</h3><p className="mt-2 text-sm leading-6 text-slate-200">William A. Hough High School, Cornelius. NC United wrestlers assisted with live training scenarios.</p></article><article className="rounded-xl bg-[#13294B] p-6 text-white"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#D3B574]">Sunday · August 24</div><h3 className="mt-2 text-xl font-bold">NC United Referee Session</h3><p className="mt-2 text-sm leading-6 text-slate-200">UNC Chapel Hill wrestling room. Led by Jonathan Sutton for NC United Blue members and drop-ins.</p></article></div></section>

      <section><h2>Investing in wrestling&apos;s future</h2><p>The partnership treated officiating as both a service opportunity and a development pathway. Athletes gained a stronger understanding of rules and positioning while North Carolina strengthened the referee pipeline needed to support the sport&apos;s continued expansion.</p></section>
    </div>
  )
}
