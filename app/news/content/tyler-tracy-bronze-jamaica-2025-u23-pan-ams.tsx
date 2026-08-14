import Link from "next/link"

const results = [
  ["Round of 16", "Alexander Matias Cusinga Gomez (Colombia)", "Won, 10–0"],
  ["Quarterfinal", "Hossman Eduardo Carvajal Rojas (Peru)", "Won, 11–0"],
  ["Semifinal", "Rafael Omar Garcia Morales (Mexico)", "Lost, 16–6"],
  ["Bronze medal", "Arnoldo Ariel Proboste (Chile)", "Won, 16–6"],
] as const

export function TylerTracyBronzeJamaica2025U23PanAmsContent() {
  return (
    <div className="space-y-10">
      <section><p><strong>QUERÉTARO, Mexico —</strong> Tyler Tracy, a North Carolina native and member of the NC State Wolfpack, earned bronze at the 2025 U23 Pan American Championships while competing for Jamaica at 74 kilograms.</p><p>The result represented one of Jamaica&apos;s strongest U23 continental finishes and secured the country a place at 74 kilograms in the U23 World Championships.</p></section>

      <section><h2>A dominant run to the podium</h2><p>Tracy opened with consecutive technical falls, outscoring his first two opponents 21–0. After a semifinal loss to Mexico&apos;s Rafael Garcia Morales, he responded with 16 points against Chile&apos;s Arnoldo Proboste to claim bronze.</p><div className="not-prose overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[640px] border-collapse text-left text-sm"><thead className="bg-[#13294B] text-white"><tr><th className="px-4 py-3">Round</th><th className="px-4 py-3">Opponent</th><th className="px-4 py-3">Result</th></tr></thead><tbody>{results.map(([round, opponent, result]) => <tr key={round} className="border-t border-slate-200 even:bg-slate-50"><td className="px-4 py-3 font-semibold text-[#13294B]">{round}</td><td className="px-4 py-3">{opponent}</td><td className="px-4 py-3 font-bold">{result}</td></tr>)}</tbody></table></div></section>

      <section><h2>World Championship qualification</h2><p>The bronze medal did more than bring hardware back to Jamaica. Tracy&apos;s result qualified Jamaica&apos;s 74-kilogram weight class for the U23 World Championships, ensuring representation on the global stage for a freestyle program continuing to expand its reach.</p></section>

      <section><h2>North Carolina roots</h2><p>Tracy developed at Cardinal Gibbons High School in Raleigh before continuing his career at NC State. His path from North Carolina to an international podium reflected both his collegiate development and Jamaican heritage.</p><p>NC United also recognized Tracy&apos;s work with younger wrestlers in the state and the example his leadership provided to North Carolina&apos;s wrestling community.</p></section>

      <section><h2>Learn more</h2><ul><li><Link href="https://gopack.com/sports/wrestling/roster/tyler-tracy/15390">Tyler Tracy · NC State Wrestling</Link></li><li><Link href="https://www.jamaicawrestlingfederation.org/">Jamaica Wrestling Federation</Link></li><li><Link href="https://www.ochorioswrestlingclub.com/">Ocho Rios Wrestling Club</Link></li></ul></section>
    </div>
  )
}
