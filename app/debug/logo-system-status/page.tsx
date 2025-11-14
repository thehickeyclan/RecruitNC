import { LogoSystemStatus } from "@/components/LOGO_SYSTEM_STATUS"

export default function LogoSystemStatusPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🛡️ Logo System Protection Dashboard</h1>
          <p className="text-gray-600">Monitor the health and protection status of critical logo system components</p>
        </div>

        <LogoSystemStatus />
      </div>
    </div>
  )
}
