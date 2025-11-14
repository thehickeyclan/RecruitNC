"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { AdminHeader } from "@/components/admin-header"
import Image from "next/image"

export default function DivisionLogosPage() {
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    "NCAA-Division-I.png": null,
    "NCAA-Division-II.png": null,
    "NCAA-Division-III.png": null,
    "NAIA.png": null,
    "JUCO.png": null,
  })
  const [previews, setPreviews] = useState<{ [key: string]: string }>({})
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<{ [key: string]: { success: boolean; message: string } }>({})
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  const handleFileChange = (fileName: string, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return

    const file = fileList[0]
    setFiles((prev) => ({ ...prev, [fileName]: file }))

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviews((prev) => ({ ...prev, [fileName]: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const uploadFile = async (fileName: string, file: File) => {
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("fileName", fileName)

      const response = await fetch("/api/admin/upload-division-logo", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      setResults((prev) => ({
        ...prev,
        [fileName]: {
          success: data.success,
          message: data.success ? "Uploaded successfully" : data.error || "Upload failed",
        },
      }))

      return data.success
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [fileName]: {
          success: false,
          message: "Error: " + String(err),
        },
      }))
      return false
    }
  }

  const handleUpload = async () => {
    setUploading(true)
    setResults({})

    for (const [fileName, file] of Object.entries(files)) {
      if (file) {
        await uploadFile(fileName, file)
      }
    }

    setUploading(false)
  }

  const logoDescriptions = {
    "NCAA-Division-I.png": "NCAA Division I logo",
    "NCAA-Division-II.png": "NCAA Division II logo",
    "NCAA-Division-III.png": "NCAA Division III logo",
    "NAIA.png": "NAIA logo",
    "JUCO.png": "Junior College logo",
  }

  return (
    <div className="container mx-auto py-8">
      <AdminHeader title="Division Logos" />

      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-bold mb-4">Upload Division Logos</h2>
        <p className="mb-4 text-gray-600">
          Upload logos for each division. The files will be saved directly to the public/division-logos directory.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {Object.entries(files).map(([fileName]) => (
            <div key={fileName} className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">{fileName}</h3>
              <p className="text-sm text-gray-500 mb-3">
                {logoDescriptions[fileName as keyof typeof logoDescriptions]}
              </p>

              <div className="h-24 border rounded flex items-center justify-center mb-3 bg-gray-50">
                {previews[fileName] ? (
                  <Image
                    src={previews[fileName] || "/placeholder.svg"}
                    alt={fileName}
                    width={120}
                    height={60}
                    className="object-contain"
                  />
                ) : (
                  <div className="text-gray-400 text-sm">No file selected</div>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(fileName, e.target.files)}
                ref={(el) => (fileInputRefs.current[fileName] = el)}
              />

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRefs.current[fileName]?.click()}
                  className="w-full"
                >
                  Select File
                </Button>

                {results[fileName] && (
                  <div
                    className={`text-xs p-2 rounded ${
                      results[fileName].success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {results[fileName].message}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button onClick={handleUpload} disabled={uploading} className="bg-blue-600 hover:bg-blue-700">
          {uploading ? "Uploading..." : "Upload All Files"}
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-bold mb-4">Instructions</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Select image files for each division logo</li>
          <li>Click "Upload All Files" to save them to the public/division-logos directory</li>
          <li>
            After uploading, visit the{" "}
            <a href="/debug/division-logos" className="text-blue-600 hover:underline">
              debug page
            </a>{" "}
            to verify that the logos are working
          </li>
        </ol>
      </div>
    </div>
  )
}
