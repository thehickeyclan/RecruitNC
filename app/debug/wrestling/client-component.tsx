"use client"

import { useEffect, useState } from "react"

interface WrestlingResult {
  wrestler_name: string
  school: string
  year: number
  weight_class: string
  place: number
  classification: string
}

export default function WrestlingDebugClient() {
  const [data, setData] = useState<WrestlingResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/debug/wrestling-2024-2025")
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setData(result.data)
        } else {
          setError(result.error)
        }
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <div>Loading 2024-2025 wrestling data...</div>
  if (error) return <div className="text-red-500">Error: {error}</div>

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Wrestling Data Debug - 2024-2025</h1>
      <p className="mb-4">Found {data.length} records for 2024-2025</p>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="border px-4 py-2">Name</th>
              <th className="border px-4 py-2">School</th>
              <th className="border px-4 py-2">Year</th>
              <th className="border px-4 py-2">Weight</th>
              <th className="border px-4 py-2">Place</th>
              <th className="border px-4 py-2">Class</th>
            </tr>
          </thead>
          <tbody>
            {data.map((result, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border px-4 py-2">{result.wrestler_name}</td>
                <td className="border px-4 py-2">{result.school}</td>
                <td className="border px-4 py-2">{result.year}</td>
                <td className="border px-4 py-2">{result.weight_class}</td>
                <td className="border px-4 py-2">{result.place}</td>
                <td className="border px-4 py-2">{result.classification}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
