"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"

const JACKSON_ID = "02d7b368-67e0-4eb7-be9e-5aca85a3352d"

export default function UpdateJacksonPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [athlete, setAthlete] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<{
    success?: boolean
    message?: string
  }>({})

  useEffect(() => {
    const fetchAthlete = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from("athletes").select("*").eq("id", JACKSON_ID).single()

        if (error) throw error
        setAthlete(data)
        if (data.photourl) {
          setPreview(data.photourl)
        }
      } catch (error) {
        console.error("Error fetching athlete:", error)
        setStatus({
          success: false,
          message: "Failed to load athlete information",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAthlete()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      // Create a preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const uploadImage = async () => {
    if (!file) {
      setStatus({
        success: false,
        message: "Please select an image first",
      })
      return
    }

    try {
      setUploading(true)
      setStatus({})

      // Create form data for the upload
      const formData = new FormData()
      formData.append("file", file)
      formData.append("athleteId", JACKSON_ID)
      formData.append("athleteName", athlete?.name || "Jackson Rowling")

      // Use the API route instead of direct Blob SDK
      const response = await fetch("/api/athletes/update-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Upload failed")
      }

      const data = await response.json()

      setStatus({
        success: true,
        message: "Jackson's image has been successfully updated!",
      })

      // Update the preview with the new URL
      setPreview(data.url)
    } catch (error) {
      console.error("Error uploading image:", error)
      setStatus({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <div className="animate-pulse">Loading athlete information...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Update Jackson's Image</CardTitle>
          <CardDescription>Upload a new profile photo for Jackson Rowling</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-center">
              {preview ? (
                <div className="relative w-32 h-32 rounded-full overflow-hidden">
                  <Image src={preview || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">No image</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="image" className="text-sm font-medium">
                Select Image
              </label>
              <input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="border rounded p-2"
              />
            </div>

            {status.message && (
              <Alert variant={status.success ? "default" : "destructive"}>
                <AlertTitle>{status.success ? "Success" : "Error"}</AlertTitle>
                <AlertDescription>{status.message}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={uploadImage} disabled={uploading || !file} className="w-full">
            {uploading ? "Uploading..." : "Update Jackson's Image"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
