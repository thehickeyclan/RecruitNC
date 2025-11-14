import { DivisionPill } from "@/components/division-pill"

export default function DivisionDisplayTestPage() {
  // Test all possible division formats
  const divisionValues = [
    "NCAA DI",
    "NCAA Division I",
    "D1",
    "Division 1",
    "NCAA DII",
    "NCAA Division II",
    "D2",
    "Division 2",
    "NCAA DIII",
    "NCAA Division III",
    "D3",
    "Division 3",
    "NAIA",
    "NJCAA",
    "JUCO",
    "Junior College",
    "Unknown",
    null,
    undefined,
    "",
  ]

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Division Display Test</h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Division Pill Component Test</h2>
        <p className="mb-6 text-gray-600">
          This page tests how the DivisionPill component renders different division values. If the component is working
          correctly, similar division values should display consistently.
        </p>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {divisionValues.map((division, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                <div className="font-mono text-sm text-gray-600">
                  {division === null
                    ? "null"
                    : division === undefined
                      ? "undefined"
                      : division === ""
                        ? '""'
                        : `"${division}"`}
                </div>
                <DivisionPill division={division as string | null | undefined} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Simulated Card Test</h2>
        <p className="mb-6 text-gray-600">This section simulates how divisions would appear in a card component.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {divisionValues.slice(0, 6).map((division, index) => (
            <div key={index} className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">Test Athlete {index + 1}</h3>
                <DivisionPill division={division as string | null | undefined} />
              </div>
              <div className="text-sm text-gray-600">
                Raw division value:{" "}
                {division === null
                  ? "null"
                  : division === undefined
                    ? "undefined"
                    : division === ""
                      ? '""'
                      : `"${division}"`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
