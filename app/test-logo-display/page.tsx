"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function TestLogoDisplayPage() {
  const [logoUrl, setLogoUrl] = useState("")

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Test Logo Display</h1>
        <p className="text-muted-foreground">Test how your uploaded logo looks</p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Logo URL Tester</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logo-url">Logo URL</Label>
            <Input
              id="logo-url"
              type="url"
              placeholder="Paste your uploaded logo URL here..."
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>

          {logoUrl && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-medium mb-2">Preview:</h3>
                <img
                  src={logoUrl || "/placeholder.svg"}
                  alt="App State Logo"
                  className="max-w-xs mx-auto border rounded-lg shadow-sm"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg?height=200&width=200&text=Error+Loading+Image"
                  }}
                />
              </div>

              <div className="text-center">
                <h3 className="font-medium mb-2">As College Logo (Small):</h3>
                <div className="flex items-center justify-center gap-2 p-4 border rounded-lg bg-gray-50">
                  <img src={logoUrl || "/placeholder.svg"} alt="App State" className="w-8 h-8 object-contain" />
                  <span className="font-medium">Appalachian State</span>
                </div>
              </div>

              <div className="text-center">
                <h3 className="font-medium mb-2">As Card Logo (Medium):</h3>
                <div className="max-w-sm mx-auto p-4 border rounded-lg bg-white shadow-sm">
                  <img
                    src={logoUrl || "/placeholder.svg"}
                    alt="App State"
                    className="w-16 h-16 object-contain mx-auto mb-2"
                  />
                  <h4 className="font-bold">Appalachian State University</h4>
                  <p className="text-sm text-muted-foreground">NCAA Division I</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
