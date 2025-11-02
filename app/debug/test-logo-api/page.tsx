"use client"

import { useState } from "react"

export default function TestLogoAPI() {
  const [entityType, setEntityType] = useState("highschool")
  const [entityName, setEntityName] = useState("Cardinal Gibbons High School")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/logo-mappings/${entityType}/${encodeURIComponent(entityName)}`)
      const data = await response.json()
      setResult({ status: response.status, data })
    } catch (error) {
      setResult({ error: error.message })
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Logo API Test</h1>

      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">Entity Type:</label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="highschool">High School</option>
            <option value="college">College</option>
            <option value="club">Club</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Entity Name:</label>
          <input
            type="text"
            value={entityName}
            onChange={(e) => setEntityName(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter entity name"
          />
        </div>

        <button
          onClick={testAPI}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Testing..." : "Test API"}
        </button>
      </div>

      {result && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">API Result (Status: {result.status})</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
