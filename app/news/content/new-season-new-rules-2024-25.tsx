const changes = [
  { title: "One-point inbounds rule", detail: "Only one point of contact from either wrestler needed to remain inside the boundary for wrestling to continue.", example: "A wrestler with one foot still inside the boundary remained inbounds." },
  { title: "Expanded near-fall scoring", detail: "Near-fall points increased with control time: two points for two seconds, three for three seconds and four for four seconds.", example: "Holding near-fall criteria for three seconds earned three points." },
  { title: "Three-point takedown", detail: "A successful takedown became worth three points instead of two, increasing the value of offense from neutral.", example: "One takedown could create a three-point swing in a close match." },
  { title: "Technical-fall clarification", detail: "When a 15-point advantage was reached through a move that continued into near-fall criteria, action continued until the near-fall sequence ended.", example: "Officials allowed the scoring sequence to finish before ending the match." },
] as const

export function NewSeasonNewRules202425Content() {
  return (
    <div className="space-y-10">
      <section><p className="text-xl font-semibold text-[#13294B]">The 2024–25 high school wrestling season introduced major NFHS changes intended to simplify scoring, improve match flow and encourage action.</p><p>For parents, coaches and fans, four updates stood out: a broader inbounds standard, revised near-fall scoring, three-point takedowns and clearer technical-fall procedures.</p></section>
      <section><h2>The major changes</h2><div className="not-prose grid gap-4 md:grid-cols-2">{changes.map((change) => <article key={change.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5"><h3 className="text-lg font-black text-[#13294B]">{change.title}</h3><p className="mt-2 leading-7 text-slate-700">{change.detail}</p><p className="mt-3 border-l-4 border-[#D3B574] pl-3 text-sm italic leading-6 text-slate-600"><strong>Example:</strong> {change.example}</p></article>)}</div></section>
      <section><h2>What it meant for the season</h2><p>Coaches needed to place greater emphasis on offensive attacks and finishing cleanly at the boundary. Wrestlers could generate more separation through takedowns and extended near-fall sequences, while spectators gained a simpler framework for understanding when action should continue.</p><p>The changes were expected to produce faster-paced matches, reduce subjective boundary calls and reward wrestlers who created scoring opportunities.</p></section>
      <section><h2>Resources and references</h2><ul><li><a href="https://www.nfhs.org/articles/new-wrestling-rules-approved-for-2024-25-season" target="_blank" rel="noreferrer">NFHS: New wrestling rules approved for the 2024–25 season</a></li><li><a href="https://intermatwrestle.com/" target="_blank" rel="noreferrer">InterMat Wrestling</a></li><li><a href="https://www.nsga.org/" target="_blank" rel="noreferrer">National Sporting Goods Association</a></li><li><a href="https://www.flowrestling.org/" target="_blank" rel="noreferrer">FloWrestling</a></li></ul></section>
    </div>
  )
}
