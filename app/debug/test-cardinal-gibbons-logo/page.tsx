"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EntityLogo } from "@/components/entity-logo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle } from "lucide-react"

export default function TestCardinalGibbonsLogo() {
  const [apiResult, setApiResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function testLogo() {
      try {
        const response = await fetch("/api/logo-mappings/highschool/Cardinal%20Gibbons%20High%20School")
        const data = await response.json()
        setApiResult(data)
      } catch (error) {
        setApiResult({ error: "Failed to fetch logo" })
      } finally {
        setLoading(false)
      }
    }

    testLogo()
  }, [])

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Cardinal Gibbons Logo Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API Response Test */}
          <div>
            <h3 className="text-lg font-semibold mb-2">API Response Test</h3>
            {loading ? (
              <div className="animate-pulse bg-gray-200 h-20 rounded"></div>
            ) : (
              <Alert variant={apiResult?.success ? "default" : "destructive"}>
                <AlertDescription className="flex items-start gap-2">
                  {apiResult?.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div>
                      <strong>Status:</strong> {apiResult?.success ? "Success" : "Failed"}
                    </div>
                    {apiResult?.logo_url && (
                      <div className="break-all text-xs">
                        <strong>URL:</strong> {apiResult.logo_url}
                      </div>
                    )}
                    {apiResult?.matched_name && (
                      <div className="text-xs">
                        <strong>Matched:</strong> {apiResult.matched_name}
                      </div>
                    )}
                    {apiResult?.error && (
                      <div className="text-red-600 text-xs">
                        <strong>Error:</strong> {apiResult.error}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Visual Logo Test */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Visual Logo Test</h3>
            <div className="flex items-center gap-4 p-4 border rounded">
              <div className="space-y-2">
                <div className="text-sm font-medium">Small (24px):</div>
                <EntityLogo entityType="highschool" entityName="Cardinal Gibbons High School" size="sm" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Medium (32px):</div>
                <EntityLogo entityType="highschool" entityName="Cardinal Gibbons High School" size="md" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Large (48px):</div>
                <EntityLogo entityType="highschool" entityName="Cardinal Gibbons High School" size="lg" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Custom (64px):</div>
                <EntityLogo entityType="highschool" entityName="Cardinal Gibbons High School" size={64} />
              </div>
            </div>
          </div>

          {/* Direct Image Test */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Direct Image Test</h3>
            <div className="p-4 border rounded">
              <img
                src="https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/highschool-logos/cardinal-gibbons-high-school.png"
                alt="Cardinal Gibbons High School Logo"
                width={48}
                height={48}
                className="object-contain"
                onLoad={() => console.log("✅ Direct image loaded successfully")}
                onError={() => console.log("❌ Direct image failed to load")}
              />
              <p className="text-xs text-gray-600 mt-2">Direct URL test</p>
            </div>
          </div>

          {/* Test Different Name Variations */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Name Variation Tests</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded">
                <div className="text-sm font-medium mb-2">Exact Match:</div>
                <EntityLogo entityType="highschool" entityName="Cardinal Gibbons High School" size="md" />
                <p className="text-xs text-gray-600 mt-1">"Cardinal Gibbons High School"</p>
              </div>
              <div className="p-3 border rounded">
                <div className="text-sm font-medium mb-2">Short Name:</div>
                <EntityLogo entityType="highschool" entityName="Cardinal Gibbons" size="md" />
                <p className="text-xs text-gray-600 mt-1">"Cardinal Gibbons"</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
