"use client"

import { useState, useEffect } from "react"

export default function CheckLogoMappingsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/debug/check-logo-mappings")
        const result = await response.json()

        if (response.ok) {
          setData(result)
        } else {
          setError(result.error || "Failed to fetch data")
        }
      } catch (err) {
        setError("Network error")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Logo Mappings Database Check</h1>

      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="text-sm text-blue-800">
          Total mappings in database: <strong>{data.total_mappings}</strong>
        </p>
      </div>

      {data.mappings_by_type &&
        Object.entries(data.mappings_by_type).map(([type, mappings]: [string, any]) => (
          <div key={type} className="mb-8">
            <h2 className="text-xl font-semibold mb-4 capitalize">
              {type} ({mappings.length})
            </h2>
            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Entity Name</th>
                    <th className="px-4 py-2 text-left">Logo URL</th>
                    <th className="px-4 py-2 text-left">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping: any, index: number) => (
                    <tr key={mapping.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="px-4 py-2 font-medium">{mapping.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{mapping.logo_url}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{mapping.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  )
}
