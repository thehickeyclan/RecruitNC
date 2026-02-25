export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B91C1C] mx-auto mb-4" />
        <p className="text-slate-600">Loading NCHSAA Results…</p>
      </div>
    </div>
  )
}
