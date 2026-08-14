import Image from "next/image"

const athleteReflections = [
  ["Gabe Rogers", "Senior · Seaforth High School", "It was a great experience to be in such a high-level room. Wrestling with the best of the best not only helped me improve, but also showed me a new level where I can compete."],
  ["Mac Johnson", "Junior · Cape Fear High School", "It was an awesome experience—a beautiful training center and campus. I didn't want to leave."],
  ["Carson Worrick", "Junior · Davie County", "My time at UVA RTC was an awesome experience. The coaches were welcoming, the facilities were top-notch and the team atmosphere was awesome."],
] as const

export function NcUnitedTrainsUvaRtc2025Content() {
  return (
    <div className="space-y-10">
      <section>
        <p><strong>CHARLOTTESVILLE, Va. — August 30, 2025 —</strong> NC United Blue athletes traveled to Charlottesville for a joint training session with the University of Virginia Regional Training Center and the Cavaliers wrestling program.</p>
        <p>The workout gave North Carolina wrestlers direct exposure to the intensity, pace and expectations of a Division I training environment.</p>
      </section>

      <section>
        <h2>Inside the Virginia wrestling room</h2>
        <p>UVA Head Coach Steve Garland welcomed the group into the Cavaliers&apos; room and led a session built around high-intensity drilling and live wrestling. Garland praised the athletes&apos; effort and composure as they handled the workout&apos;s tempo and physical demands.</p>
        <figure className="not-prose mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><Image src="/images/news/legacy/nc-united-uva-rtc-2025/locker-room-group.png" alt="NC United Blue athletes with University of Virginia wrestling staff" width={1536} height={864} className="h-auto w-full" /><figcaption className="p-3 text-sm text-slate-600">NC United Blue athletes following their training session in Charlottesville.</figcaption></figure>
      </section>

      <section>
        <h2>Normalizing college-level training</h2>
        <p>The visit reflected a central principle of NC United Blue: create consistent opportunities for elite high school wrestlers to train together and alongside college athletes. Experiences at college practices, RTCs and college opens help athletes adapt to the next level before they arrive there.</p>
        <p>By repeatedly entering demanding environments, athletes can accelerate their development, raise their expectations and make more informed decisions about collegiate wrestling.</p>
        <figure className="not-prose mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><Image src="/images/news/legacy/nc-united-uva-rtc-2025/wrestling-room-group.png" alt="NC United Blue athletes standing together in the University of Virginia wrestling room" width={1536} height={864} className="h-auto w-full" /></figure>
      </section>

      <section>
        <h2>In their own words</h2>
        <div className="not-prose grid gap-4">
          {athleteReflections.map(([name, school, quote]) => (
            <blockquote key={name} className="m-0 rounded-xl border-l-4 border-[#E57200] bg-slate-50 p-5 text-slate-800">
              <p className="text-base leading-7">“{quote}”</p><footer className="mt-3 text-sm font-bold text-[#13294B]">— {name}, {school}</footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section>
        <h2>Experience that opens doors</h2>
        <p>Sessions like this build readiness for college wrestling while giving athletes valuable recruiting exposure. NC United planned to continue pursuing training opportunities in college rooms and RTC environments across the country.</p>
        <p>NC United thanked Coach Garland, the UVA RTC and the University of Virginia for their hospitality and for investing in the development of North Carolina wrestlers.</p>
      </section>
    </div>
  )
}
