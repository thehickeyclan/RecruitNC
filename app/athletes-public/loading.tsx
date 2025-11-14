export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-nc-blue via-slate-900 to-nc-red">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nc-gold mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading athletes...</p>
        </div>
      </div>
    </div>
  )
}
