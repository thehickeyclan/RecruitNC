"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, RefreshCw } from "lucide-react"

export default function SetupUnifiedMediaPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSetup = async () => {
    try {
      setLoading(true)
      setResult(null)

      // Try the simple approach first
      const response = await fetch("/api/run-script/create-unified-media-tables-simple", {
        method: "POST",
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Setup failed",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-nc-blue via-slate-900 to-nc-red">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">Setup Unified Media Manager</h1>
            <p className="text-gray-300 text-lg">Initialize the database tables for the unified media system</p>
          </div>

          <Card className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="text-nc-blue">Database Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-semibold">This setup will create:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Enhanced media_items table with comprehensive metadata</li>
                  <li>Media usage tracking table</li>
                  <li>Performance indexes for fast searching</li>
                  <li>Automatic timestamp triggers</li>
                  <li>Support for categories, aliases, tags, and entity relationships</li>
                </ul>
              </div>

              {result && (
                <Alert variant={result.success ? "default" : "destructive"}>
                  {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button onClick={handleSetup} disabled={loading} className="flex-1 bg-nc-blue hover:bg-nc-blue/90">
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    "Setup Database Tables"
                  )}
                </Button>

                {result?.success && (
                  <Button
                    onClick={() => (window.location.href = "/admin/unified-media-manager")}
                    className="flex-1 bg-nc-gold text-nc-blue hover:bg-nc-gold/90"
                  >
                    Open Media Manager
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="text-nc-blue">Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Upload & Organization</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Auto image optimization by category</li>
                    <li>• Custom aliases and metadata</li>
                    <li>• Tag-based organization</li>
                    <li>• Entity relationship tracking</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Management & Usage</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Advanced search and filtering</li>
                    <li>• Usage tracking and prevention</li>
                    <li>• Bulk editing capabilities</li>
                    <li>• Grid and list view modes</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
