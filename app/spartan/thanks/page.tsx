export default function SpartanThanksPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-16 text-center">
      <h1 className="font-[family-name:var(--font-barlow-spartan)] text-3xl font-bold uppercase text-white">Thank you</h1>
      <p className="mt-4 text-[#bbb]">
        Your charitable contribution to NC United Wrestling is processing. You&apos;ll receive an acknowledgement email. If you asked for a race
        entry, we pass Spartan the details they need to email your Fayetteville code — timing depends on their schedule and
        batching.
      </p>
      <p className="mt-3 max-w-lg mx-auto text-xs text-[#888] leading-relaxed">
        Acknowledgements are prepared under IRC charitable-gift documentation standards — whether your gift qualifies as deductible on your return depends on your facts; confirm with your tax advisor.
      </p>
      <p className="mt-6 text-sm text-[#666]">Questions?{" "}
        <a href="mailto:info@ncwrestlingunited.com" className="text-[#C8A94A] hover:underline">
          info@ncwrestlingunited.com
        </a>
      </p>
      <a
        href="/spartan"
        className="mt-10 inline-flex min-h-[48px] items-center justify-center border border-white/40 px-6 font-[family-name:var(--font-barlow-spartan)] text-sm font-bold uppercase tracking-wide text-white hover:border-white"
      >
        ← Back to Spartan page
      </a>
    </div>
  )
}
