"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface Blob {
  url: string
  pathname: string
}

export default function CheckBlobUploadsPage() {
  const [blobs, setBlobs] = useState<Blob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBlobs = async () => {
      try {
        const response = await fetch("/api/debug/check-blob-uploads")
        const data = await response.json()

        if (data.success) {
          setBlobs(data.blobs)
        } else {
          setError(data.error || "Failed to fetch blobs")
        }
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }

    fetchBlobs()
  }, [])

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Check Blob Uploads</h1>

      {loading ? (
        <div className="text-center py-4">Loading blob data...</div>
      ) : error ? (
        <div className="bg-red-100 text-red-800 p-4 rounded">{error}</div>
      ) : blobs.length === 0 ? (
        <div className="bg-yellow-100 text-yellow-800 p-4 rounded">No blobs found with prefix "division-logos/"</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Found {blobs.length} Blobs</h2>

          <div className="space-y-4">
            {blobs.map((blob, index) => (
              <div key={index} className="border p-4 rounded">
                <div className="flex items-center gap-4">
                  <div className="border p-1 bg-gray-50">
                    <Image
                      src={blob.url || "/placeholder.svg"}
                      alt={blob.pathname}
                      width={120}
                      height={60}
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{blob.pathname.split("/").pop()}</p>
                    <p className="text-xs text-gray-500 break-all">{blob.url}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="font-bold mb-2">Insert These Logos into Database</h3>
            <p className="mb-4">Click the button below to manually insert these logos into the database:</p>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={async () => {
                try {
                  const response = await fetch("/api/debug/insert-division-logos", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ blobs }),
                  })
                  const data = await response.json()
                  if (data.success) {
                    alert(`Success! Inserted ${data.insertedCount} logos into the database.`)
                  } else {
                    alert(`Error: ${data.error}`)
                  }
                } catch (err) {
                  alert(`Error: ${err}`)
                }
              }}
            >
              Insert Logos into Database
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
