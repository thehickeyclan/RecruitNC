"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EntityLogo } from "@/components/entity-logo"

export default function LogoTestPage() {
  const [entityType, setEntityType] = useState<"college" | "highschool" | "club">("highschool")
  const [entityName, setEntityName] = useState("McDowell")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkLogo = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/debug/logo-check?type=${entityType}&name=${encodeURIComponent(entityName)}`)
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Error checking logo:", error)
      setResult({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-2xl font-bold">Logo Testing Tool</h1>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Test Logo Mapping</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Entity Type</label>
                <div className="flex space-x-2">
                  <Button
                    variant={entityType === "college" ? "default" : "outline"}
                    onClick={() => setEntityType("college")}
                  >
                    College
                  </Button>
                  <Button
                    variant={entityType === "highschool" ? "default" : "outline"}
                    onClick={() => setEntityType("highschool")}
                  >
                    High School
                  </Button>
                  <Button variant={entityType === "club" ? "default" : "outline"} onClick={() => setEntityType("club")}>
                    Club
                  </Button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Entity Name</label>
                <Input
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  placeholder="Enter entity name"
                />
              </div>

              <Button onClick={checkLogo} disabled={loading}>
                {loading ? "Checking..." : "Check Logo"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <div className="rounded bg-gray-50 p-4">
                  <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(result, null, 2)}</pre>
                </div>

                <div className="flex items-center space-x-4">
                  <div>
                    <p className="mb-2 text-sm font-medium">Logo Preview:</p>
                    <EntityLogo category={entityType} name={entityName} size="lg" />
                  </div>
                  {result.logoUrl && (
                    <div>
                      <p className="mb-2 text-sm font-medium">Direct Image:</p>
                      <img
                        src={result.logoUrl || "/placeholder.svg"}
                        alt={`${entityName} logo`}
                        className="h-16 w-16 rounded object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Run a test to see results</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded border p-4">
              <h3 className="mb-2 font-medium">McDowell High School</h3>
              <div className="flex items-center space-x-2">
                <EntityLogo category="highschool" name="McDowell" />
                <span>McDowell</span>
              </div>
            </div>

            <div className="rounded border p-4">
              <h3 className="mb-2 font-medium">Cardinal Gibbons High School</h3>
              <div className="flex items-center space-x-2">
                <EntityLogo category="highschool" name="Cardinal Gibbons" />
                <span>Cardinal Gibbons</span>
              </div>
            </div>

            <div className="rounded border p-4">
              <h3 className="mb-2 font-medium">Appalachian State University</h3>
              <div className="flex items-center space-x-2">
                <EntityLogo category="college" name="Appalachian State University" />
                <span>Appalachian State</span>
              </div>
            </div>

            <div className="rounded border p-4">
              <h3 className="mb-2 font-medium">RAW Wrestling Club</h3>
              <div className="flex items-center space-x-2">
                <EntityLogo category="club" name="RAW" />
                <span>RAW</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
