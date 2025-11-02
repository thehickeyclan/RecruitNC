"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface LinkResult {
  matchId: string
  athleteName: string
  athleteId?: string
  success: boolean
  error?: string
}

interface FixMatchLinksResponse {
  success: boolean
  totalUnlinkedMatches: number
  linkedCount: number
  linkResults: LinkResult[]
  summary: {
    successfulLinks: number
    failedLinks: number
  }
}

export default function FixMissingMatchLinks() {
  const [results, setResults] = useState<FixMatchLinksResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const fixMatchLinks = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/fix-missing-match-links", {
        method: "POST",
      })
      const data = await response.json()
      if (data.error) {
        console.error("API Error:", data.error)
        alert(`Error: ${data.error}`)
        setResults(null)
      } else {
        setResults(data)
      }
    } catch (error) {
      console.error("Error fixing match links:", error)
      alert("Failed to fix match links. Check console for details.")
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Fix Missing Match Links</h1>

      <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 mb-6">
        <p className="text-yellow-800">
          This tool will attempt to link unlinked match records to athlete profiles by matching names.
        </p>
      </div>

      <Button onClick={fixMatchLinks} disabled={loading} className="mb-6">
        {loading ? "Fixing Links..." : "Fix Missing Match Links"}
      </Button>

      {results && results.summary && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Results Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{results.totalUnlinkedMatches}</div>
                <div className="text-sm text-gray-600">Total Unlinked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{results.summary.successfulLinks}</div>
                <div className="text-sm text-gray-600">Successfully Linked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{results.summary.failedLinks}</div>
                <div className="text-sm text-gray-600">Failed to Link</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {results.totalUnlinkedMatches > 0
                    ? ((results.summary.successfulLinks / results.totalUnlinkedMatches) * 100).toFixed(1)
                    : 0}
                  %
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>
          </div>

          {/* Successful Links */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-green-600">
              Successfully Linked ({results.summary.successfulLinks})
            </h2>
            <div className="max-h-96 overflow-y-auto">
              <div className="grid gap-2">
                {results.linkResults
                  .filter((r) => r.success)
                  .map((result, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <div>
                        <span className="font-medium">{result.athleteName}</span>
                        <span className="text-sm text-gray-600 ml-2">Match ID: {result.matchId}</span>
                      </div>
                      {result.athleteId && (
                        <a
                          href={`/athletes/${result.athleteId}`}
                          className="text-blue-600 hover:underline text-sm"
                          target="_blank"
                          rel="noreferrer"
                        >
                          View Profile
                        </a>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Failed Links */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-red-600">Failed to Link ({results.summary.failedLinks})</h2>
            <div className="max-h-96 overflow-y-auto">
              <div className="grid gap-2">
                {results.linkResults
                  .filter((r) => !r.success)
                  .map((result, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <div>
                        <span className="font-medium">{result.athleteName}</span>
                        <span className="text-sm text-red-600 ml-2">{result.error}</span>
                      </div>
                      <span className="text-sm text-gray-600">Match ID: {result.matchId}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
