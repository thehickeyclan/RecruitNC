"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ImageCheckPage() {
  const [imagePath, setImagePath] = useState("/diverse-wrestlers.png")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [imageError, setImageError] = useState(false)

  const checkImage = async () => {
    setLoading(true)
    setImageError(false)
    try {
      const response = await fetch(`/api/debug/check-image-exists?path=${encodeURIComponent(imagePath)}`)
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Error checking image:", error)
      setResult({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Image Checker Debug Tool</h1>

      <div className="flex gap-4 mb-6">
        <Input
          value={imagePath}
          onChange={(e) => setImagePath(e.target.value)}
          placeholder="Enter image path (e.g., /diverse-wrestlers.png)"
          className="flex-1"
        />
        <Button onClick={checkImage} disabled={loading}>
          {loading ? "Checking..." : "Check Image"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Image Preview</h2>
          <div className="border rounded-lg p-4 bg-gray-50 min-h-[300px] flex items-center justify-center">
            {imagePath ? (
              <div className="relative w-full h-[250px]">
                <Image
                  src={imagePath || "/placeholder.svg"}
                  alt="Image preview"
                  fill
                  className="object-contain"
                  onError={() => setImageError(true)}
                />
                {imageError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-500">
                    Failed to load image
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-400">Enter an image path to preview</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Check Result</h2>
          <div className="border rounded-lg p-4 bg-gray-50 min-h-[300px] overflow-auto">
            {result ? (
              <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
            ) : (
              <p className="text-gray-400">Click "Check Image" to see results</p>
            )}
          </div>
        </div>
      </div>

      {result?.availableFiles && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Available Wrestler Images</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {result.availableFiles.map((file: string) => (
              <div
                key={file}
                className="border rounded-lg p-2 hover:bg-gray-50 cursor-pointer"
                onClick={() => setImagePath(`/${file}`)}
              >
                <p className="text-sm mb-2 truncate">{file}</p>
                <div className="relative h-[100px]">
                  <Image
                    src={`/${file}`}
                    alt={file}
                    fill
                    className="object-contain"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
