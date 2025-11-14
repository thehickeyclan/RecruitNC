import { DivisionLogo } from "@/components/division-logo"

export default function DivisionLogosDebugPage() {
  // Test cases for different division formats
  const divisionFormats = [
    "Division I",
    "D1",
    "NCAA D1",
    "Division II",
    "D2",
    "NCAA D2",
    "Division III",
    "D3",
    "NCAA D3",
    "NAIA",
    "JUCO",
    "Junior College",
    "Unknown Division",
  ]

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Division Logos Debug</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {divisionFormats.map((division, index) => (
          <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Format: &quot;{division}&quot;</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Small Size</h3>
                <DivisionLogo division={division} size="sm" />
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Medium Size (Default)</h3>
                <DivisionLogo division={division} size="md" />
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Large Size</h3>
                <DivisionLogo division={division} size="lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
