/** Sends immediately so the document request completes; page then loads and fetches athlete. */
export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-[#002147] font-medium">Loading profile…</div>
    </div>
  )
}
