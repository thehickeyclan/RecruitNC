import Image from "next/image"

const gallery = [
  ["gold-training-1.png", "NC United Gold athletes training in freestyle technique"],
  ["gold-training-2.png", "Wrestlers listening during an NC United Gold practice"],
  ["gold-training-3.png", "An NC United Gold athlete working through a freestyle position"],
] as const

export function NcUnitedGoldLaunch2025Content() {
  return (
    <div className="space-y-10">
      <div className="not-prose rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><strong>Archive note:</strong> This program announcement was published April 23, 2025. Practice details and participation information reflect the original launch.</div>

      <section><p>NC United announced NC United Gold, an elite program created to unite leading North Carolina women wrestlers, accelerate freestyle development and pursue regional and national success.</p><p>The initiative joined NC United Blue as part of the nonprofit&apos;s effort to provide athletes with national competition, collegiate preparation and opportunities to represent North Carolina.</p></section>

      <section><h2>What NC United Gold offered</h2><ul><li><strong>Elite freestyle training:</strong> A competitive, supportive environment built around high-level athletes and experienced coaches.</li><li><strong>National competition:</strong> Preparation for Southeast Regionals, Fargo Nationals, Super 32 and Women&apos;s National Championships.</li><li><strong>Complete athlete development:</strong> Strength and conditioning, nutrition, weight management, mindset coaching and recruiting support.</li><li><strong>Expanded opportunities:</strong> Access to national camps, college programs and facilities supporting collegiate and international goals.</li></ul><blockquote>“NC United Gold is about creating a legacy for women’s wrestling in North Carolina. We’re giving our athletes the tools to compete at the highest levels and the inspiration to lead the next generation.”<footer>— Veronica Carlson</footer></blockquote></section>

      <section><h2>A statewide hub across levels</h2><p>The program welcomed high school wrestlers, college athletes and women pursuing international competition. Bringing athletes from different ages and experience levels into one room allowed established competitors to sharpen their skills while mentoring the next generation.</p><p>It also created a training home for women attending colleges without varsity wrestling, allowing them to continue developing and remain connected to the sport.</p></section>

      <section><h2>Freestyle as the bridge to college</h2><p>Because collegiate women&apos;s wrestling uses freestyle rather than the folkstyle common in North Carolina high schools, NC United Gold emphasized the transition in technique, scoring and pace.</p><blockquote>“Freestyle wrestling is the future for our athletes, opening doors to collegiate and international success. Our program will bridge the gap, ensuring our wrestlers are ready to dominate on the national stage.”<footer>— Brandon Palmer, Head Coach</footer></blockquote><p>Support from programs including Greensboro College, Montreat College and the University of Mount Olive helped strengthen that statewide pipeline.</p></section>

      <section><h2>A foundation built in 2024</h2><p>The initiative followed two inaugural freestyle practices led by Veronica Carlson in 2024—one at the University of Mount Olive focused on freestyle fundamentals and another at Greensboro College that brought high school and college wrestlers together.</p><div className="not-prose grid gap-4 md:grid-cols-3">{gallery.map(([src, alt]) => <figure key={src} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><div className="relative aspect-[3/4]"><Image src={`/images/news/legacy/nc-united-gold-launch-2025/${src}`} alt={alt} fill className="object-cover" sizes="(min-width: 768px) 33vw, 100vw" /></div></figure>)}</div></section>

      <section><h2>A commitment to excellence</h2><ul><li>Freestyle development as the foundation for training and collegiate preparation.</li><li>A minimum of two statewide practices each month.</li><li>Teams representing NC United Gold at premier national events.</li><li>A culture centered on excellence, resilience, unity and leadership.</li></ul><blockquote>“We’re building a program that will make North Carolina a powerhouse in women’s wrestling. NC United Gold is about unity, excellence, and giving our athletes the opportunities they deserve.”<footer>— Matt Hickey, Co-Founder, NC United</footer></blockquote></section>

      <section><h2>Representing North Carolina</h2><p>The program asked athletes first to represent themselves and their families, then their teams and clubs, and beyond state lines, their entire state. NC United Gold aimed to build champions on the mat while preparing wrestlers to become coaches, referees and leaders in their communities.</p></section>
    </div>
  )
}
