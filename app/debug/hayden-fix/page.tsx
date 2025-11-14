"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

export default function HaydenFixPage() {
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [imageTest, setImageTest] = useState(false)

  const updateHaydenImage = async () => {
    setLoading(true)
    setStatus("Updating Hayden's image...")

    try {
      const response = await fetch("/api/debug/update-hayden", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          photourl: "/wrestler-profile.png",
        }),
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()
      setStatus(`Success! ${data.message}`)
    } catch (error) {
      setStatus(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Fix Hayden's Image</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Update to Local Image</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">This will update Hayden's image to use a local file stored in the public directory.</p>
            <Button onClick={updateHaydenImage} disabled={loading}>
              {loading ? "Updating..." : "Update Hayden's Image"}
            </Button>

            {status && (
              <div className={`mt-4 p-3 rounded ${status.includes("Success") ? "bg-green-100" : "bg-amber-100"}`}>
                {status}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Image Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-64 w-48 mx-auto border rounded-md overflow-hidden">
              <Image src="/wrestler-profile.png" alt="Local wrestler image" fill className="object-cover" />
            </div>
            <p className="text-center mt-4 text-sm text-gray-500">This is the local image that will be used</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Test Image Display</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <Button onClick={() => setImageTest(!imageTest)} className="mb-6">
                {imageTest ? "Hide Test" : "Show Test"}
              </Button>

              {imageTest && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="flex flex-col items-center">
                    <h3 className="font-medium mb-2">Next.js Image (Local)</h3>
                    <div className="relative h-64 w-48 border rounded-md overflow-hidden">
                      <Image
                        src="/wrestler-profile.png"
                        alt="Local wrestler with Next.js Image"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <h3 className="font-medium mb-2">Regular img tag (Local)</h3>
                    <div className="h-64 w-48 border rounded-md overflow-hidden">
                      <img
                        src="/wrestler-profile.png"
                        alt="Local wrestler with img tag"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <h3 className="font-medium mb-2">Direct img tag (Picsum)</h3>
                    <div className="h-64 w-48 border rounded-md overflow-hidden">
                      <img
                        src="https://picsum.photos/400/600"
                        alt="Picsum photo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
