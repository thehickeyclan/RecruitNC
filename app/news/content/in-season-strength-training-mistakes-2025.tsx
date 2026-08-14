const mistakes = [
  ["Neglecting strength maintenance", "Stopping strength work entirely can allow power to decline.", "Use appropriately programmed, lower-volume sessions built around sound compound movements."],
  ["Focusing only on endurance", "High-repetition work alone may not preserve strength and explosiveness.", "Balance conditioning with strength and power work appropriate to the competition schedule."],
  ["Overtraining", "Hard practices, frequent matches and strength sessions can accumulate excessive fatigue.", "Adjust volume around competition and schedule lighter weeks when recovery demands increase."],
  ["Ignoring recovery", "Insufficient sleep, nutrition and hydration undermine adaptation and performance.", "Space sessions intelligently and make recovery part of the training plan."],
  ["Failing to adapt to weight management", "Aggressive weight loss can compromise health, energy and strength.", "Use sustainable nutrition and hydration practices under qualified guidance."],
  ["Using a generic lifting plan", "Programs designed for another sport may miss wrestling's positional and physical demands.", "Prioritize individual needs, grip strength, total-body power and movement quality."],
  ["Ignoring individual needs", "One program cannot fit every athlete, weight class and training history.", "Scale exercise selection, load and volume to the wrestler in front of you."],
  ["Lifting hard too close to competition", "Heavy sessions immediately before matches can leave an athlete fatigued.", "Place demanding work earlier in the week and taper as competition approaches."],
  ["Neglecting injury prevention", "Skipping warm-ups, mobility and foundational work can reduce preparedness.", "Include targeted movement preparation for the shoulders, hips, knees and trunk."],
  ["Failing to track training", "Without records, coaches and athletes cannot see trends or manage progression.", "Track key lifts, effort, soreness and performance so the plan can be adjusted."],
] as const

export function InSeasonStrengthTrainingMistakes2025Content() {
  return (
    <div className="space-y-10">
      <section><p className="text-xl font-semibold text-[#13294B]">In-season strength training should help wrestlers preserve power and durability without competing with practice, recovery or match performance.</p><p>The most common mistakes come from treating lifting as either all-or-nothing: abandoning it completely, or training with so much volume that the athlete cannot recover.</p></section>
      <section><h2>Ten mistakes—and smarter alternatives</h2><div className="not-prose space-y-4">{mistakes.map(([title, problem, solution], index) => <article key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-5 md:flex md:gap-5"><div className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#13294B] font-black text-white md:mb-0">{index + 1}</div><div><h3 className="text-lg font-black text-[#13294B]">{title}</h3><p className="mt-2 leading-7 text-slate-700"><strong>The problem:</strong> {problem}</p><p className="mt-1 leading-7 text-slate-700"><strong>A better approach:</strong> {solution}</p></div></article>)}</div></section>
      <section><h2>Train for performance, not exhaustion</h2><p>The purpose of in-season lifting is not to win the weight room. It is to support wrestling performance by maintaining useful strength, managing fatigue and keeping the athlete prepared for the matches that matter.</p><p>Training load, nutrition, hydration and weight-management decisions should be individualized. Young athletes should work with their coaches, parents and appropriately qualified health or performance professionals rather than attempting aggressive cuts or copying another athlete&apos;s program.</p></section>
    </div>
  )
}
