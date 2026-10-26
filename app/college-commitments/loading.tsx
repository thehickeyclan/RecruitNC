export default function Loading() {
  return (
    <main className="min-h-screen bg-[#0A1628]">
      <section className="border-b border-white/10">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <div className="h-12 max-w-md animate-pulse rounded-lg bg-white/5" />
          <div className="mt-4 h-5 max-w-sm animate-pulse rounded bg-white/5" />
        </div>
      </section>
      <div className="container mx-auto space-y-6 px-4 py-8">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[76px] animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
        <div className="h-[480px] animate-pulse rounded-xl bg-white/5" />
      </div>
    </main>
  )
}
