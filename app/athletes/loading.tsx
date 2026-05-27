/** Route-level loading UI for /athletes — matches commitments layout shell. */
export function AthletesPageSkeleton() {
  return (
    <main className="min-h-screen bg-[#0A1628]">
      <section className="border-b border-white/10 bg-[#0f1c2e]">
        <div className="container mx-auto px-4 py-10">
          <div className="mx-auto h-16 max-w-md animate-pulse rounded-lg bg-white/5" />
        </div>
      </section>
      <section className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[500px] max-w-[350px] mx-auto w-full animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      </section>
    </main>
  )
}

export default function Loading() {
  return <AthletesPageSkeleton />
}
