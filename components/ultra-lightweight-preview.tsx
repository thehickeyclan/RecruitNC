"use client"

export default function UltraLightweightPreview() {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">NC Wrestling Commitments</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                A{i}
              </div>
              <div>
                <h3 className="font-semibold">Athlete {i}</h3>
                <p className="text-sm text-gray-600">Sample College</p>
              </div>
            </div>
            <div className="text-xs text-blue-600">NCAA D1 • Class of 2024</div>
          </div>
        ))}
      </div>
    </div>
  )
}
