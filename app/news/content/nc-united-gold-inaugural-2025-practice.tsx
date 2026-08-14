import Link from "next/link"

const collegeAthletes = [
  ["Hailie Misplay", "Fargo All-American, 2024–25 NCAA Academic All-American and Greensboro College student assistant coach."],
  ["Kyra Tomlinson", "NCAA qualifier and Academic All-American who brought a high standard of technical work and preparation."],
  ["Genesis Chinchilla", "Two-year NCAA starter whose college experience added competitive depth to the training room."],
] as const

export function NcUnitedGoldInaugural2025PracticeContent() {
  return (
    <div className="space-y-10">
      <section><p>The Greensboro College wrestling room filled with energy on Sunday, April 27, as NC United Gold held its first women&apos;s freestyle practice of 2025.</p><p>The session brought together high school standouts, collegiate wrestlers and athletes with international aspirations, establishing the statewide training hub envisioned when the program launched.</p></section>

      <section><h2>Iron sharpened iron</h2><p>Folkstyle national and state champions trained alongside emerging athletes, while current college wrestlers sharpened their own freestyle skills and mentored the younger participants. That blend of experience made shared development the defining feature of the inaugural practice.</p></section>

      <section><h2>College athletes in the room</h2><div className="not-prose grid gap-4 md:grid-cols-3">{collegeAthletes.map(([name, detail]) => <article key={name} className="rounded-xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-bold text-[#13294B]">{name}</h3><p className="mt-2 text-sm leading-6 text-slate-700">{detail}</p></article>)}</div></section>

      <section><h2>Programs, coaches and community</h2><blockquote>“It is awesome for NC United to create opportunities for women’s and girls wrestling. Greensboro College is glad to be part of building opportunities.”<footer>— Jon Woodburn, Greensboro College Head Wrestling Coach</footer></blockquote><p>Woodburn also highlighted how motivating it was to work with athletes eager to improve. Greensboro&apos;s student-athletes and staff had returned from the U.S. Open and immediately helped host NC United Blue and Gold practices that Sunday.</p><p>U.S. Open finalist Mitch Johnson also joined the session, sharing experience developed through his work with Greensboro College&apos;s teams and clubs across North Carolina.</p></section>

      <section><h2>A growing college foundation</h2><p>Greensboro College had recently finished 28th at the NCAA National Collegiate Women&apos;s Wrestling Championships. Its roster included NCAA qualifiers such as Kyra Tomlinson and the program&apos;s first women&apos;s wrestling All-American, Destiny Vaughans, while four Academic All-Americans over three seasons reflected success beyond the mat.</p><p><Link href="https://greensborocollegesports.com/sports/womens-wrestling">Greensboro College Women&apos;s Wrestling</Link></p></section>

      <section><h2>A new era began</h2><p>The practice demonstrated what NC United Gold intended to build: a collaborative, high-performance environment where wrestlers across ages and experience levels could develop together.</p><p>By connecting high school prospects, collegiate athletes, coaches and mentors, the first 2025 session established a foundation for stronger freestyle development and long-term growth in North Carolina women&apos;s wrestling.</p></section>
    </div>
  )
}
