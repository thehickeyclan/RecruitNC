import { LogoMatchWidget } from "@/components/ai/logo-match-widget"
import { MissingLogosDashboard } from "@/components/ai/missing-logos-dashboard"

export default function AIMediaManagerPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">AI Media Manager</h1>
        <p className="text-gray-600">
          Intelligent logo matching and missing logo detection for NC wrestling organizations
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Logo Matching Widget */}
        <div className="space-y-4">
          <LogoMatchWidget />
        </div>

        {/* Missing Logos Dashboard */}
        <div className="space-y-4">
          <MissingLogosDashboard />
        </div>
      </div>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">🎯 Smart Logo Matching</h3>
          <p className="text-sm text-blue-800">
            AI-powered logo matching with 95%+ accuracy for NC wrestling organizations. Supports exact matches,
            abbreviations, and fuzzy search.
          </p>
        </div>
        <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
          <h3 className="font-semibold text-orange-900 mb-2">🔍 Missing Logo Detection</h3>
          <p className="text-sm text-orange-800">
            Automatically identifies organizations without logos, prioritized by wrestler count. Provides search
            suggestions and abbreviations.
          </p>
        </div>
        <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">⚡ Intelligent Caching</h3>
          <p className="text-sm text-green-800">
            24-hour logo match cache and 30-minute missing logo cache for optimal performance. Real-time refresh
            capability.
          </p>
        </div>
      </div>
    </div>
  )
}
