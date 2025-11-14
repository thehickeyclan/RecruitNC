"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface DatabaseInfo {
  tables: string[]
  matches_columns: string[]
  sample_records: any[]
  total_count: number
  anna_data: any[]
  liam_data: any[]
}

export default function MatchDataRawPage() {
  const [data, setData] = useState<DatabaseInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    loadRawData()
  }, [])

  const loadRawData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/debug/match-data-raw")
      const result = await response.json()

      if (result.error) {
        setError(result.error)
      } else {
        setData(result)
      }
    } catch (err) {
      setError("Failed to load raw data")
      console.error("Error loading raw data:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Raw Match Data Debug</h1>
        <div className="text-center py-8">
          <p>Loading database information...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Raw Match Data Debug</h1>
        <Alert className="border-red-500">
          <AlertDescription>
            <p className="font-semibold text-red-700">Error loading raw data</p>
            <p>{error}</p>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Raw Match Data Debug</h1>
        <p className="text-gray-600">Database structure and raw data inspection</p>
        <div className="mt-2 space-x-4">
          <a href="/admin/match-records" className="text-blue-600 hover:underline text-sm">
            ← Back to Match Records
          </a>
          <Button onClick={loadRawData} size="sm" variant="outline">
            Refresh Data
          </Button>
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          {/* Database Tables */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Database Tables</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {data.tables.map((table, index) => (
                <div key={index} className="bg-gray-100 px-3 py-2 rounded text-sm">
                  {table}
                </div>
              ))}
            </div>
          </div>

          {/* Matches Table Columns */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Matches Table Columns</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {data.matches_columns.map((column, index) => (
                <div key={index} className="bg-blue-100 px-3 py-2 rounded text-sm">
                  {column}
                </div>
              ))}
            </div>
          </div>

          {/* Record Count */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Record Statistics</h2>
            <div className="text-lg">
              <p>
                <strong>Total Records:</strong> {data.total_count}
              </p>
              <p>
                <strong>Anna's Records:</strong> {data.anna_data.length}
              </p>
              <p>
                <strong>Liam's Records:</strong> {data.liam_data.length}
              </p>
            </div>
          </div>

          {/* Sample Records */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Sample Records (First 3)</h2>
            <div className="space-y-4">
              {data.sample_records.map((record, index) => (
                <div key={index} className="border rounded p-4 bg-gray-50">
                  <h3 className="font-medium mb-2">
                    Record {index + 1}: {record.first_name} {record.last_name}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p>
                        <strong>Season:</strong> {record.season}
                      </p>
                      <p>
                        <strong>Grade:</strong> {record.grade}
                      </p>
                      <p>
                        <strong>High School:</strong> {record.high_school}
                      </p>
                      <p>
                        <strong>Total Matches:</strong> {record.total_matches}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>Wins:</strong> {record.wins}
                      </p>
                      <p>
                        <strong>Losses:</strong> {record.losses}
                      </p>
                      <p>
                        <strong>Pins:</strong> {record.pins}
                      </p>
                      <p>
                        <strong>Tech Falls:</strong> {record.tech_falls}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p>
                      <strong>Has Individual Matches:</strong> {record.matches ? "Yes" : "No"}
                    </p>
                    {record.matches && (
                      <p>
                        <strong>Match Count:</strong>{" "}
                        {Array.isArray(record.matches) ? record.matches.length : "Invalid format"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Anna's Data */}
          {data.anna_data.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Anna's Data</h2>
              <div className="space-y-4">
                {data.anna_data.map((record, index) => (
                  <div key={index} className="border rounded p-4 bg-pink-50">
                    <h3 className="font-medium mb-2">
                      {record.first_name} {record.last_name} - {record.grade} ({record.season})
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p>
                          <strong>Record:</strong> {record.wins}-{record.losses}
                        </p>
                        <p>
                          <strong>Total Matches:</strong> {record.total_matches}
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Pins:</strong> {record.pins}
                        </p>
                        <p>
                          <strong>Tech Falls:</strong> {record.tech_falls}
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Win %:</strong>{" "}
                          {record.total_matches > 0 ? ((record.wins / record.total_matches) * 100).toFixed(1) : 0}%
                        </p>
                        <p>
                          <strong>Pin %:</strong> {record.pin_percentage}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Liam's Data */}
          {data.liam_data.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Liam's Data</h2>
              <div className="space-y-4">
                {data.liam_data.map((record, index) => (
                  <div key={index} className="border rounded p-4 bg-blue-50">
                    <h3 className="font-medium mb-2">
                      {record.first_name} {record.last_name} - {record.grade} ({record.season})
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p>
                          <strong>Record:</strong> {record.wins}-{record.losses}
                        </p>
                        <p>
                          <strong>Total Matches:</strong> {record.total_matches}
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Pins:</strong> {record.pins}
                        </p>
                        <p>
                          <strong>Tech Falls:</strong> {record.tech_falls}
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Win %:</strong>{" "}
                          {record.total_matches > 0 ? ((record.wins / record.total_matches) * 100).toFixed(1) : 0}%
                        </p>
                        <p>
                          <strong>Individual Matches:</strong>{" "}
                          {record.matches
                            ? Array.isArray(record.matches)
                              ? record.matches.length
                              : "Invalid"
                            : "None"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
