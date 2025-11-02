"use client"

import type React from "react"

import { useState } from "react"

export default function UploadHaydenPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError("Please select a file")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // First upload the file to blob storage
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", "athlete")
      formData.append("name", "hayden-haynes")

      const uploadResponse = await fetch("/api/blob-upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image")
      }

      const uploadResult = await uploadResponse.json()

      // Now update Hayden's record with the new image URL
      const updateResponse = await fetch("/api/update-hayden-direct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl: uploadResult.url }),
      })

      if (!updateResponse.ok) {
        throw new Error("Failed to update Hayden's record")
      }

      const updateResult = await updateResponse.json()
      setResult(updateResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Upload New Image for Hayden</h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="mb-4">
          <label htmlFor="image" className="block mb-2">
            Select Image
          </label>
          <input type="file" id="image" accept="image/*" onChange={handleFileChange} className="border p-2 w-full" />
        </div>

        {preview && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">Preview</h2>
            <div className="w-40 h-40 relative">
              <img src={preview || "/placeholder.svg"} alt="Preview" className="object-cover w-full h-full" />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !file}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
        >
          {loading ? "Uploading..." : "Upload and Update Hayden"}
        </button>
      </form>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {result && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <h2 className="font-bold">Success!</h2>
          <p>Hayden's image has been updated.</p>
          <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div className="mt-4">
        <a href="/" className="text-blue-500 hover:underline">
          Return to Homepage
        </a>
      </div>
    </div>
  )
}
