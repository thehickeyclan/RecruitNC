/** Sends immediately so the document request completes; page then loads and fetches athlete. */
export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-[#D3B574]" />
    </div>
  )
}
