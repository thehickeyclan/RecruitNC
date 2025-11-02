"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AdminHeader } from "@/components/admin-header"

interface FileInfo {
  name: string
  id: string
  metadata: any
}

export default function MoveDivisionLogosPage() {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState(false)
  const [results, setResults] = useState<{ [key: string]: { success: boolean; message: string } }>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/list-uploaded-files")
      const data = await response.json()

      if (data.success) {
        // Filter for division logo files
        const divisionFiles = data.files.filter(
          (file: FileInfo) => file.name.includes("NCAA") || file.name.includes("NAIA") || file.name.includes("JUCO"),
        )
        setFiles(divisionFiles)
      } else {
        setError(data.error || "Failed to fetch files")
      }
    } catch (err) {
      setError("Error fetching files: " + String(err))
    } finally {
      setLoading(false)
    }
  }

  const copyFile = async (fileName: string) => {
    try {
      setCopying(true)

      const response = await fetch("/api/admin/copy-to-public", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName,
          sourcePath: "colleges",
          destinationPath: "division-logos",
        }),
      })

      const data = await response.json()

      setResults((prev) => ({
        ...prev,
        [fileName]: {
          success: data.success,
          message: data.success ? data.message : data.error,
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

  const copyAllFiles = async () => {
    setCopying(true)
    setResults({})

    for (const file of files) {
      await copyFile(file.name)
    }

    setCopying(false)
  }

  return (
    <div className="container mx-auto py-8">
      <AdminHeader title="Move Division Logos" />

      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-bold mb-4">Division Logo Files</h2>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading files...</p>
          </div>
        ) : (
          <>
            {files.length === 0 ? (
              <p className="text-gray-600">
                No division logo files found. Please upload files with NCAA, NAIA, or JUCO in the name.
              </p>
            ) : (
              <>
                <div className="mb-4">
                  <Button onClick={copyAllFiles} disabled={copying} className="bg-blue-600 hover:bg-blue-700">
                    {copying ? "Moving Files..." : "Move All Files to Public Directory"}
                  </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          File Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {files.map((file) => (
                        <tr key={file.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{file.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {results[file.name] ? (
                              <span className={results[file.name].success ? "text-green-600" : "text-red-600"}>
                                {results[file.name].message}
                              </span>
                            ) : (
                              "Not moved yet"
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button
                              onClick={() => copyFile(file.name)}
                              disabled={copying || results[file.name]?.success === true}
                              variant="outline"
                              size="sm"
                            >
                              {results[file.name]?.success === true ? "Moved" : "Move to Public"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-bold mb-4">Instructions</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Upload your division logo files to the Colleges category in the media manager</li>
          <li>Make sure the files are named correctly: NCAA-Division-I.png, NCAA-Division-II.png, etc.</li>
          <li>Use this page to move the files to the public/division-logos directory</li>
          <li>After moving, the logos will automatically be used in the NCAADivisionBadge component</li>
        </ol>
      </div>
    </div>
  )
}
