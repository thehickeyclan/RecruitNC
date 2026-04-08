export default function SpartanThanksPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-16 text-center">
      <h1 className="font-[family-name:var(--font-barlow-spartan)] text-3xl font-bold uppercase text-white">Thank you</h1>
      <p className="mt-4 text-[#bbb]">
        Your tax-deductible gift to NC United is processing. You&apos;ll receive a receipt by email. If you requested a race
        entry, NC United shares donor information with Spartan Race so they can email your Fayetteville code — timing
        depends on batching and their process. Same partner flow we&apos;re running with Joe&apos;s team.
      </p>
      <p className="mt-6 text-sm text-[#666]">Questions?{" "}
        <a href="mailto:contact@ncunitedwrestling.com" className="text-[#C8A94A] hover:underline">
          contact@ncunitedwrestling.com
        </a>
      </p>
      <a
        href="/spartan"
        className="mt-10 inline-flex min-h-[48px] items-center justify-center border border-white/40 px-6 font-[family-name:var(--font-barlow-spartan)] text-sm font-bold uppercase tracking-wide text-white hover:border-white"
      >
        ← Back to campaign
      </a>
    </div>
  )
}
