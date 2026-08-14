import Link from "next/link"

export function ClassOf2025CollegeCommitsContent() {
  return (
    <div className="space-y-10">
      <section>
        <p className="text-xl font-semibold text-[#13294B]">
          Your story deserves to be remembered. RecruitNC&apos;s final gift to the Class of 2025 is preserving your high school legacy in digital stone—keeping your profile, achievements and match history alive for future generations.
        </p>
        <p>
          NC United introduced RecruitNC as a new resource for wrestling recruiting in North Carolina and beyond, bringing prospect rankings, high school and club profiles, college profiles and college commitments together for athletes, families and coaches. Its first feature celebrated the graduating Class of 2025.
        </p>
      </section>

      <section>
        <h2>A historic North Carolina class</h2>
        <p>
          The Class of 2025 marked the end of an era as one of the final groups to compete under North Carolina&apos;s four-classification structure. More importantly, it raised the standard for wrestling across the state through its performances, leadership and willingness to compete together.
        </p>
        <p>
          All-North Carolina teams delivered historic results at the 2024 Ultimate Club Duals and the 2025 NHSCA Duals. The UCD team reached the gold final, while the NHSCA Duals team advanced to the Round of 16—the best performances recorded by all-North Carolina teams at those events.
        </p>
        <p>
          Athletes from this class also helped develop younger teammates, contributing to a year in which North Carolina produced more NHSCA individual All-Americans than ever before. The Class of 2025 recorded the state&apos;s second-best NHSCA individual performance since 1990.
        </p>
      </section>

      <section>
        <h2>From every corner of the state</h2>
        <p>
          These graduates represented clubs and high schools across North Carolina and committed to college programs at every level, from NCAA Division I through NAIA. With NC United launching in 2024, the class spent more time training together, challenging one another and living the principle that iron sharpens iron.
        </p>
      </section>

      <section className="not-prose rounded-2xl bg-[#07142f] p-6 text-white md:p-8">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#D3B574]">To the Class of 2025</p>
        <p className="mt-4 text-lg leading-8 text-slate-100">
          Wrestling is your foundation, not your destination. Use it as a springboard toward your collegiate goals and everything that follows. Balance competition with academics and career preparation. Seek internships, mentorship and meaningful relationships early—and always give back to keep North Carolina wrestling strong.
        </p>
      </section>

      <section>
        <h2>A legacy preserved</h2>
        <p>
          RecruitNC preserves each athlete&apos;s high school profile, achievements and match history as a permanent record of the journey that brought this class to the college level.
        </p>
        <p>
          <Link href="/athletes" className="font-bold text-[#13294B] underline decoration-[#D3B574] decoration-2 underline-offset-4">
            Explore North Carolina athlete profiles and college commitments
          </Link>
        </p>
        <p><strong>Congratulations, Class of 2025—your legacy is just beginning.</strong></p>
      </section>
    </div>
  )
}
