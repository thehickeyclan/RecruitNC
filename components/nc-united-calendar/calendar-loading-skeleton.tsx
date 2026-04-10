/** Skeleton for /calendar initial load — matches grid + header layout. */
export function CalendarLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-300 px-4 py-8 sm:py-10">
      <div className="mb-10 space-y-3 text-center">
        <div className="mx-auto h-3 w-24 rounded-full bg-slate-200" />
        <div className="mx-auto h-12 max-w-md rounded-xl bg-slate-200 sm:h-16" />
        <div className="mx-auto h-4 max-w-lg rounded-lg bg-slate-100" />
      </div>
      <div className="mb-6 h-24 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-100" />
            <div className="h-7 w-40 rounded-lg bg-slate-100" />
            <div className="h-9 w-9 rounded-full bg-slate-100" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-16 rounded-full bg-slate-100" />
            <div className="h-9 w-36 rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="h-72 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm lg:col-span-1">
          <div className="mb-4 h-5 w-28 rounded bg-slate-100" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-4 rounded bg-slate-100" />
                <div className="h-4 flex-1 rounded bg-slate-50" />
              </div>
            ))}
          </div>
        </div>
        <div className="min-h-[420px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm lg:col-span-3">
          <div className="grid grid-cols-7 gap-px border-b border-slate-200 bg-slate-50 p-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-4 rounded bg-slate-100" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px p-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="min-h-[72px] rounded-md bg-slate-50/80 p-1 sm:min-h-[100px]">
                <div className="mb-1 h-5 w-5 rounded-full bg-slate-100" />
                <div className="h-2 w-full rounded bg-slate-100/80" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
