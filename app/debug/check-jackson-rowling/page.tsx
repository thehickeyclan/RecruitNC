"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CheckJacksonRowling() {
  const [jacksonData, setJacksonData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const findJackson = async () => {
    setLoading(true)
    try {
      // Search for Jackson Rowling specifically
      const response = await fetch("/api/athletes?search=Jackson Rowling")
      const data = await response.json()
      console.log("Jackson search results:", data)

      if (data.athletes && data.athletes.length > 0) {
        const jackson = data.athletes.find(
          (a: any) => a.name.toLowerCase().includes("jackson") && a.name.toLowerCase().includes("rowling"),
        )
        setJacksonData(jackson || data.athletes[0])
      }
    } catch (error) {
      console.error("Error finding Jackson:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    findJackson()
  }, [])

  if (loading) {
    return <div>Loading Jackson Rowling data...</div>
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🔍 Jackson Rowling Data Check</h1>

      <Card>
        <CardHeader>
          <CardTitle>Jackson Rowling Raw Data</CardTitle>
        </CardHeader>
        <CardContent>
          {jacksonData ? (
            <div className="space-y-4">
              <div className="bg-gray-100 p-4 rounded">
                <h3 className="font-bold mb-2">Raw JSON Data:</h3>
                <pre className="text-xs overflow-auto">{JSON.stringify(jacksonData, null, 2)}</pre>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold">Key Fields:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>
                      <strong>ID:</strong> {jacksonData.id}
                    </li>
                    <li>
                      <strong>Name:</strong> {jacksonData.name}
                    </li>
                    <li>
                      <strong>College:</strong> {jacksonData.college || "N/A"}
                    </li>
                    <li>
                      <strong>High School:</strong> {jacksonData.highschool || jacksonData.high_school || "N/A"}
                    </li>
                    <li>
                      <strong>Wrestling Club:</strong>{" "}
                      {jacksonData.wrestlingClub || jacksonData.wrestling_club || jacksonData.club || "N/A"}
                    </li>
                    <li>
                      <strong>Division:</strong> {jacksonData.division || jacksonData.college_division || "N/A"}
                    </li>
                    <li>
                      <strong>Weight:</strong> {jacksonData.weightclass || jacksonData.weight_class || "N/A"}
                    </li>
                    <li>
                      <strong>Grad Year:</strong> {jacksonData.graduationyear || jacksonData.graduation_year || "N/A"}
                    </li>
                    <li>
                      <strong>Photo:</strong> {jacksonData.photourl || jacksonData.image_url || "N/A"}
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold">All Available Fields:</h4>
                  <ul className="space-y-1 text-xs">
                    {Object.keys(jacksonData).map((key) => (
                      <li key={key}>
                        <strong>{key}:</strong> {String(jacksonData[key]).substring(0, 50)}
                        {String(jacksonData[key]).length > 50 ? "..." : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p>Jackson Rowling not found. Let me search all athletes...</p>
              <Button onClick={findJackson} className="mt-4">
                Search Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
