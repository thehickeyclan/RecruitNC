"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { clientMediaService } from "@/lib/media-manager/client-service"
import { RefreshCw, Upload, Search, Database, Trash2 } from "lucide-react"

export default function TestMediaManagerSimplePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [file, setFile] = useState<File | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [items, setItems] = useState<any[]>([])

  const testConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/media-manager/test-connection")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Connection test failed",
      })
    } finally {
      setLoading(false)
    }
  }

  const uploadFile = async () => {
    if (!file) {
      setResult({ success: false, error: "Please select a file first" })
      return
    }

    setLoading(true)
    try {
      const result = await clientMediaService.uploadMedia(file, {
        category: "test",
        alt: "Test image",
        caption: "Test upload from simple page",
      })
      setResult(result)
      if (result.success) {
        setFile(null)
        // Reset file input
        const fileInput = document.getElementById("file-input") as HTMLInputElement
        if (fileInput) fileInput.value = ""
        // Refresh search results
        if (items.length > 0) {
          searchItems()
        }
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      })
    } finally {
      setLoading(false)
    }
  }

  const searchItems = async () => {
    setLoading(true)
    try {
      const result = await clientMediaService.searchMedia("all", searchTerm)
      setItems(result.data || [])
      setResult({
        success: result.success,
        message: `Found ${result.data?.length || 0} items`,
      })
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Search failed",
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteItem = async (id: string) => {
    try {
      const success = await clientMediaService.deleteMedia(id)
      if (success) {
        setItems(items.filter((item) => item.id !== id))
        setResult({ success: true, message: "Item deleted successfully" })
      } else {
        setResult({ success: false, error: "Delete failed" })
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Simple Media Manager Test</h1>
          <p className="text-gray-600 mt-2">Test all media manager functionality</p>
        </div>

        {/* Connection Test */}
        <Card>
          <CardHeader>
            <CardTitle>Database Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testConnection} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>File Upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="file-input">Select File</Label>
              <Input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button onClick={uploadFile} disabled={loading || !file}>
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or filename..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button onClick={searchItems} disabled={loading}>
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {items.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Media Items ({items.length})</h4>
                <div className="grid gap-2 max-h-64 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.original_name}</p>
                        <p className="text-xs text-gray-500">
                          {item.category} • {item.filename} • {Math.round(item.size_bytes / 1024)}KB
                        </p>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View Image
                        </a>
                      </div>
                      <Button size="sm" variant="destructive" onClick={() => deleteItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            <AlertDescription>
              <div className="space-y-2">
                <div>
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "Success" : "Error"}
                  </Badge>
                </div>
                <p>{result.success ? result.message : result.error}</p>
                {result.data && (
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
