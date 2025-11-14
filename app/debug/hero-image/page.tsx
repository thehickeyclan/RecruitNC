"use client"

import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function HeroImagePage() {
  const heroImageUrl =
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-l66EWfrh9so8cVacjyQF37uTxPYZA6.png"

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/">
          <Button variant="outline">← Back to Home</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hero Banner Image - Main Page</CardTitle>
          <p className="text-gray-600">
            This is the current hero banner image used on the homepage of the NC Wrestling Portal
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Image Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Image Details:</h3>
              <ul className="space-y-1 text-sm">
                <li>
                  <strong>Alt Text:</strong> "NC Wrestling Arena with State Flag"
                </li>
                <li>
                  <strong>Source:</strong> Vercel Blob Storage
                </li>
                <li>
                  <strong>Usage:</strong> Homepage hero banner background
                </li>
                <li>
                  <strong>Overlay:</strong> Black overlay at 40% opacity
                </li>
              </ul>
            </div>

            {/* Full Size Image */}
            <div className="border rounded-lg overflow-hidden">
              <div className="relative w-full h-96">
                <Image
                  src={heroImageUrl || "/placeholder.svg"}
                  alt="NC Wrestling Arena with State Flag"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            {/* How it appears on homepage (with overlay) */}
            <div className="border rounded-lg overflow-hidden">
              <h3 className="font-semibold p-4 bg-gray-50">How it appears on homepage (with dark overlay):</h3>
              <div className="relative w-full h-96">
                <Image
                  src={heroImageUrl || "/placeholder.svg"}
                  alt="NC Wrestling Arena with State Flag"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-black/40"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h1 className="text-4xl font-bold mb-4">The NC Recruiting Portal</h1>
                    <p className="text-lg">
                      Tracking North Carolina's top wrestling prospects and their college commitments.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Image URL for reference */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Image URL:</h3>
              <code className="text-sm bg-white p-2 rounded border block break-all">{heroImageUrl}</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
