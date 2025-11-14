"use client"

import { useState } from "react"
import { RobustImage } from "@/components/robust-image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ImageTestPage() {
  const [imageUrl, setImageUrl] = useState(
    "https://v0.dev/placeholder.svg?height=400&width=300&query=college+wrestler+commitment+photo",
  )
  const [testUrl, setTestUrl] = useState(imageUrl)

  const handleTest = () => {
    setTestUrl(imageUrl)
  }

  const predefinedUrls = [
    "https://v0.dev/placeholder.svg?height=400&width=300&query=college+wrestler+commitment+photo",
    "https://picsum.photos/400/300",
    "/diverse-wrestlers.png",
    "https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2342&auto=format&fit=crop",
  ]

  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-3xl font-bold">Image Component Test</h1>

      <div className="space-y-4">
        <div className="flex gap-4">
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Enter image URL to test"
            className="flex-1"
          />
          <Button onClick={handleTest}>Test URL</Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {predefinedUrls.map((url, index) => (
            <Button
              key={index}
              variant="outline"
              onClick={() => {
                setImageUrl(url)
                setTestUrl(url)
              }}
            >
              Test: {url.substring(0, 30)}...
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Next.js Image Component</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-[400px] w-[300px] bg-muted rounded-md overflow-hidden">
              <RobustImage src={testUrl} alt="Test image" fill className="object-cover" />
            </div>
            <p className="mt-4 text-sm break-all">{testUrl}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regular HTML img tag</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-[300px] bg-muted rounded-md overflow-hidden">
              <img src={testUrl || "/placeholder.svg"} alt="Test image" className="w-full h-full object-cover" />
            </div>
            <p className="mt-4 text-sm break-all">{testUrl}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
