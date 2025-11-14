"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, AlertCircle, Upload } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"

interface Entity {
  name: string
  type: string
}

interface EntityLogoStatus {
  name: string
  type: string
  exists: boolean
  logoUrl: string | null
}

interface DynamicLogoUploadProps {
  entities: Entity[]
  onLogosReady: (ready: boolean) => void
}

export function DynamicLogoUpload({ entities, onLogosReady }: DynamicLogoUploadProps) {
  const [logoStatuses, setLogoStatuses] = useState<EntityLogoStatus[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadedLogos, setUploadedLogos] = useState<Record<string, string>>({})
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({})
  const { toast } = useToast()

  useEffect(() => {
    console.log("DynamicLogoUpload received entities:", entities)

    if (entities.length === 0) {
      setLogoStatuses([])
      onLogosReady(true)
      return
    }

    const checkLogos = async () => {
      try {
        console.log("Checking logos for entities:", entities)

        const response = await fetch("/api/check-entity-logos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entities }),
        })

        console.log("Logo check response status:", response.status)

        if (response.ok) {
          const { results } = await response.json()
          console.log("Logo check results:", results)
          setLogoStatuses(results)
          const allExist = results.every((result: EntityLogoStatus) => result.exists)
          console.log("All logos exist:", allExist)
          onLogosReady(allExist)
        } else {
          console.error("Logo check failed with status:", response.status)
          // Assume logos don't exist if check fails
          const fallbackResults = entities.map((entity) => ({
            name: entity.name,
            type: entity.type,
            exists: false,
            logoUrl: null,
          }))
          console.log("Using fallback results:", fallbackResults)
          setLogoStatuses(fallbackResults)
          onLogosReady(false)
        }
      } catch (error) {
        console.error("Error checking logos:", error)
        // Assume logos don't exist if check fails
        const fallbackResults = entities.map((entity) => ({
          name: entity.name,
          type: entity.type,
          exists: false,
          logoUrl: null,
        }))
        console.log("Using fallback results due to error:", fallbackResults)
        setLogoStatuses(fallbackResults)
        onLogosReady(false)
      }
    }

    checkLogos()
  }, [entities, onLogosReady])

  useEffect(() => {
    const missingLogos = logoStatuses.filter((status) => !status.exists)
    const uploadedCount = Object.keys(uploadedLogos).length
    const allReady = missingLogos.length === 0 || missingLogos.length === uploadedCount
    console.log("Logo readiness check:", { missingLogos: missingLogos.length, uploadedCount, allReady })
    onLogosReady(allReady)
  }, [logoStatuses, uploadedLogos, onLogosReady])

  const handleFileUpload = async (entity: Entity, file: File) => {
    const entityKey = `${entity.type}-${entity.name}`
    setUploading(entityKey)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("entityName", entity.name)
      formData.append("entityType", entity.type)

      console.log("Uploading file for:", entity)

      const response = await fetch("/api/upload-entity-logo", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Upload successful:", result)

        setUploadedLogos((prev) => ({
          ...prev,
          [entityKey]: result.logoUrl,
        }))

        setLogoStatuses((prev) =>
          prev.map((status) =>
            status.name === entity.name && status.type === entity.type
              ? { ...status, exists: true, logoUrl: result.logoUrl }
              : status,
          ),
        )

        toast({
          title: "Logo Uploaded",
          description: `Logo for ${entity.name} uploaded successfully`,
        })
      } else {
        const errorData = await response.json()
        console.error("Upload failed:", errorData)
        throw new Error(errorData.error || "Upload failed")
      }
    } catch (error) {
      console.error("Error uploading logo:", error)
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Upload failed",
        variant: "destructive",
      })
    } finally {
      setUploading(null)
    }
  }

  const handleUrlSubmit = async (entity: Entity, url: string) => {
    const entityKey = `${entity.type}-${entity.name}`
    setUploading(entityKey)

    try {
      const formData = new FormData()
      formData.append("logoUrl", url)
      formData.append("entityName", entity.name)
      formData.append("entityType", entity.type)

      console.log("Saving URL for:", entity, url)

      const response = await fetch("/api/upload-entity-logo", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        console.log("URL save successful:", result)

        setUploadedLogos((prev) => ({
          ...prev,
          [entityKey]: result.logoUrl,
        }))

        setLogoStatuses((prev) =>
          prev.map((status) =>
            status.name === entity.name && status.type === entity.type
              ? { ...status, exists: true, logoUrl: result.logoUrl }
              : status,
          ),
        )

        setUrlInputs((prev) => ({ ...prev, [entityKey]: "" }))

        toast({
          title: "Logo Added",
          description: `Logo URL for ${entity.name} saved successfully`,
        })
      } else {
        const errorData = await response.json()
        console.error("URL save failed:", errorData)
        throw new Error(errorData.error || "URL save failed")
      }
    } catch (error) {
      console.error("Error saving logo URL:", error)
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Save failed",
        variant: "destructive",
      })
    } finally {
      setUploading(null)
    }
  }

  const missingLogos = logoStatuses.filter(
    (status) => !status.exists && !uploadedLogos[`${status.type}-${status.name}`],
  )

  console.log("Rendering DynamicLogoUpload:", {
    entities: entities.length,
    logoStatuses: logoStatuses.length,
    missingLogos: missingLogos.length,
  })

  // Always show something if we have entities - for debugging
  if (entities.length === 0) {
    return null
  }

  // Show loading state while checking logos
  if (logoStatuses.length === 0) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-blue-700">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
            <span className="text-sm">Checking for existing logos...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show upload section if there are missing logos
  if (missingLogos.length > 0) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertCircle className="h-5 w-5" />
            Missing Logos ({missingLogos.length})
          </CardTitle>
          <p className="text-sm text-orange-700">Upload logos for these entities before submitting:</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {missingLogos.map((status) => {
            const entityKey = `${status.type}-${status.name}`
            const isUploaded = uploadedLogos[entityKey]
            const isUploading = uploading === entityKey
            const currentUrl = urlInputs[entityKey] || ""

            return (
              <div key={entityKey} className="border rounded-lg p-4 space-y-4 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{status.name}</h4>
                    <p className="text-sm text-gray-500 capitalize">{status.type}</p>
                  </div>
                  {isUploaded ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="h-4 w-4" />
                      <span className="text-sm font-medium">Ready</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Missing</span>
                    </div>
                  )}
                </div>

                {isUploaded ? (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="relative h-12 w-12 flex-shrink-0">
                      <Image
                        src={isUploaded || "/placeholder.svg"}
                        alt={`${status.name} logo`}
                        fill
                        className="object-contain rounded"
                      />
                    </div>
                    <span className="text-sm text-green-700 font-medium">Logo uploaded successfully</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* File Upload Section */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Upload Logo File</Label>
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-4 text-gray-500" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                handleFileUpload({ name: status.name, type: status.type }, file)
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500">Or</span>
                      </div>
                    </div>

                    {/* URL Input Section */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Paste Logo URL</Label>
                      <div className="flex gap-2">
                        <Input
                          type="url"
                          placeholder="https://example.com/logo.png"
                          value={currentUrl}
                          onChange={(e) => setUrlInputs((prev) => ({ ...prev, [entityKey]: e.target.value }))}
                          disabled={isUploading}
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && currentUrl.trim()) {
                              handleUrlSubmit({ name: status.name, type: status.type }, currentUrl.trim())
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isUploading || !currentUrl.trim()}
                          onClick={() => {
                            if (currentUrl.trim()) {
                              handleUrlSubmit({ name: status.name, type: status.type }, currentUrl.trim())
                            }
                          }}
                        >
                          Save URL
                        </Button>
                      </div>
                    </div>

                    {isUploading && (
                      <div className="flex items-center justify-center gap-2 text-blue-600 py-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="text-sm font-medium">Uploading logo...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    )
  }

  // Show success state if all logos exist
  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-green-700">
          <Check className="h-4 w-4" />
          <span className="text-sm font-medium">All logos are available - ready to submit!</span>
        </div>
      </CardContent>
    </Card>
  )
}
