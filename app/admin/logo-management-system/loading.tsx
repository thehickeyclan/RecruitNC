export default function Loading() {
  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-nc-gold border-t-transparent mx-auto mb-4"></div>
          <span className="text-lg text-gray-600">Loading Logo Management System...</span>
        </div>
      </div>
    </div>
  )
}
