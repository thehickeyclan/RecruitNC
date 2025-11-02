export default function ProspectsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner Skeleton */}
      <div className="bg-gradient-to-r from-green-600 to-green-800">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="h-12 w-64 bg-green-500 rounded mx-auto mb-4 animate-pulse" />
            <div className="h-6 w-96 bg-green-500 rounded mx-auto animate-pulse" />
          </div>
        </div>
      </div>

      {/* Search Section Skeleton */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="h-8 w-64 bg-gray-200 rounded mb-4 animate-pulse" />
            <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Filter Section Skeleton */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-4">
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-48 bg-gray-200 rounded mb-4" />
              <div className="h-6 bg-gray-200 rounded mb-2" />
              <div className="h-4 bg-gray-200 rounded mb-2" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
