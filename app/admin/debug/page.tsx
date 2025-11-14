"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { mockColleges, mockHighSchools, mockWrestlingClubs } from "@/lib/mock-data"
import { Loader2, Plus, Trash } from "lucide-react"
import Image from "next/image"
import { ClientOnly } from "@/components/client-only"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useLogoMappings, saveLogoMapping } from "@/lib/logo-mappings"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function DebugPage() {
  const [activeTab, setActiveTab] = useState<"college" | "highschool" | "club">("college")
  const [images, setImages] = useState<{ url: string; pathname: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [entityLogos, setEntityLogos] = useState<Record<string, string | null>>({})
  const [isCheckingMatches, setIsCheckingMatches] = useState(false)
  const [selectedMappings, setSelectedMappings] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  // State for custom entities
  const [customEntities, setCustomEntities] = useState<string[]>([])
  const [newEntityName, setNewEntityName] = useState("")

  // Get existing mappings from the database
  const { mappings: existingMappings, isLoading: isMappingsLoading } = useLogoMappings(activeTab)

  // Load custom entities from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`custom${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}s`)
      if (saved) {
        try {
          setCustomEntities(JSON.parse(saved))
        } catch (e) {
          console.error(`Error parsing custom ${activeTab}s:`, e)
        }
      } else {
        setCustomEntities([]) // Reset when changing tabs
      }
    }
  }, [activeTab])

  // Set initial selected mappings from existing mappings
  useEffect(() => {
    if (!isMappingsLoading) {
      const filteredMappings: Record<string, string> = {}

      // Filter mappings to only include those for the active tab
      Object.entries(existingMappings).forEach(([key, value]) => {
        // Check if this mapping exists in our current entity list
        const entityList = getEntityList()
        if (entityList.some((entity) => entity.name === key)) {
          filteredMappings[key] = value
        }
      })

      // Only set selected mappings if we don't already have mappings
      // This prevents overwriting user changes when switching tabs
      if (Object.keys(selectedMappings).length === 0) {
        setSelectedMappings(filteredMappings)
      }
    }
  }, [existingMappings, isMappingsLoading, activeTab])

  // Fetch all images for the active category
  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/blob/list?prefix=${activeTab}/`)
        if (response.ok) {
          const data = await response.json()
          setImages(data.blobs)
        }
      } catch (error) {
        console.error("Error fetching images:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchImages()
  }, [activeTab])

  // Helper function to get the appropriate entity list based on active tab
  const getEntityList = () => {
    switch (activeTab) {
      case "college":
        return [
          ...mockColleges,
          ...customEntities.map((name) => ({ name, division: "Unknown", location: "Unknown", conference: "Unknown" })),
        ]
      case "highschool":
        return [...mockHighSchools, ...customEntities.map((name) => ({ name, location: "Unknown" }))]
      case "club":
        return [...(mockWrestlingClubs || []), ...customEntities.map((name) => ({ name, location: "Unknown" }))]
      default:
        return []
    }
  }

  // Add a new custom entity
  const addCustomEntity = () => {
    if (!newEntityName.trim()) return

    const updatedEntities = [...customEntities, newEntityName.trim()]
    setCustomEntities(updatedEntities)
    setNewEntityName("")

    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(
        `custom${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}s`,
        JSON.stringify(updatedEntities),
      )
    }

    toast({
      title: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} added`,
      description: `${newEntityName} has been added to the list`,
    })
  }

  // Remove a custom entity
  const removeCustomEntity = (name: string) => {
    const updatedEntities = customEntities.filter((entity) => entity !== name)
    setCustomEntities(updatedEntities)

    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(
        `custom${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}s`,
        JSON.stringify(updatedEntities),
      )
    }

    // Also remove from mappings if exists
    const updatedMappings = { ...selectedMappings }
    delete updatedMappings[name]
    setSelectedMappings(updatedMappings)

    toast({
      title: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} removed`,
      description: `${name} has been removed from the list`,
    })
  }

  // Check logo matches for all entities
  const checkMatches = async () => {
    setIsCheckingMatches(true)
    const logos: Record<string, string | null> = {}

    const entities = getEntityList()

    // Check each entity
    for (const entity of entities) {
      if (!entity.name) continue

      try {
        const response = await fetch(`/api/images/entity?category=${activeTab}&name=${encodeURIComponent(entity.name)}`)
        if (response.ok) {
          const data = await response.json()
          logos[entity.name] = data.url
        }
      } catch (error) {
        console.error(`Error checking match for ${entity.name}:`, error)
      }
    }

    setEntityLogos(logos)
    setIsCheckingMatches(false)
  }

  // Handle manual mapping of logos to entities
  const handleMapLogo = (entityName: string, imageUrl: string) => {
    setSelectedMappings({
      ...selectedMappings,
      [entityName]: imageUrl,
    })
  }

  // Save mappings to database
  const saveMappings = async () => {
    setIsSaving(true)
    try {
      let successCount = 0
      let failCount = 0

      // Save each mapping to the database
      for (const [entityName, logoUrl] of Object.entries(selectedMappings)) {
        if (logoUrl === "no-logo") continue

        // Normalize entity name to ensure consistent case handling
        const normalizedEntityName = entityName.trim()

        console.log(`Saving mapping for ${normalizedEntityName} (${activeTab}): ${logoUrl}`)

        // Use the saveLogoMapping function from lib/logo-mappings.ts
        const success = await saveLogoMapping({
          entity_name: normalizedEntityName,
          entity_type: activeTab,
          logo_url: logoUrl,
        })

        if (success) {
          successCount++
        } else {
          failCount++
          console.error(`Failed to save mapping for ${normalizedEntityName}`)
        }
      }

      if (failCount === 0) {
        toast({
          title: "Mappings saved",
          description: `Successfully saved ${successCount} logo mappings`,
        })
      } else {
        toast({
          title: "Some mappings failed",
          description: `Saved ${successCount} mappings, but ${failCount} failed`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving mappings:", error)
      toast({
        title: "Error saving mappings",
        description: "There was an error saving the logo mappings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Persist selected mappings to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && Object.keys(selectedMappings).length > 0) {
      localStorage.setItem(`logoMappings_${activeTab}`, JSON.stringify(selectedMappings))
    }
  }, [selectedMappings, activeTab])

  // Load selected mappings from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMappings = localStorage.getItem(`logoMappings_${activeTab}`)
      if (savedMappings) {
        try {
          const parsedMappings = JSON.parse(savedMappings)
          // Only set if we don't already have mappings from the database
          if (Object.keys(selectedMappings).length === 0) {
            setSelectedMappings(parsedMappings)
          }
        } catch (e) {
          console.error(`Error parsing saved logo mappings for ${activeTab}:`, e)
        }
      }
    }
  }, [activeTab])

  // Get the entity list for the current tab
  const entityList = getEntityList()

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">Logo Mapping Manager</h1>

      <Tabs defaultValue="college" value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="college">Colleges</TabsTrigger>
          <TabsTrigger value="highschool">High Schools</TabsTrigger>
          <TabsTrigger value="club">Wrestling Clubs</TabsTrigger>
        </TabsList>

        {["college", "highschool", "club"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Uploaded {tab.charAt(0).toUpperCase() + tab.slice(1)} Logos</span>
                  <Button onClick={() => window.location.reload()}>Refresh</Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClientOnly>
                  {isLoading ? (
                    <div className="flex h-40 items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : images.length === 0 ? (
                    <p className="text-center text-muted-foreground">No images found</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                      {images.map((image) => (
                        <div key={image.url} className="overflow-hidden rounded-md border">
                          <div className="aspect-square w-full">
                            <div className="relative h-full w-full">
                              <Image
                                src={image.url || "/placeholder.svg"}
                                alt={`${tab} logo`}
                                fill
                                className="object-contain p-2"
                              />
                            </div>
                          </div>
                          <div className="bg-muted p-2">
                            <p className="truncate text-xs font-medium">{image.pathname.split("/").pop()}</p>
                            <p className="truncate text-xs text-muted-foreground">{new URL(image.url).pathname}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ClientOnly>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Custom {tab.charAt(0).toUpperCase() + tab.slice(1)}</CardTitle>
                <CardDescription>Add {tab}s that aren't in the default list</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`${tab}Name`}>Name</Label>
                    <Input
                      id={`${tab}Name`}
                      value={newEntityName}
                      onChange={(e) => setNewEntityName(e.target.value)}
                      placeholder={`Enter ${tab} name`}
                    />
                  </div>
                  <Button onClick={addCustomEntity} disabled={!newEntityName.trim()}>
                    <Plus className="mr-2 h-4 w-4" /> Add {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Button>
                </div>

                {customEntities.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-2 font-medium">Custom {tab.charAt(0).toUpperCase() + tab.slice(1)}s</h3>
                    <div className="space-y-2">
                      {customEntities.map((entity) => (
                        <div key={entity} className="flex items-center justify-between rounded-md border p-2">
                          <span>{entity}</span>
                          <Button variant="ghost" size="sm" onClick={() => removeCustomEntity(entity)}>
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Manual Logo Mapping</span>
                  <Button onClick={saveMappings} disabled={isSaving || isMappingsLoading}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      "Save Mappings"
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClientOnly>
                  {isMappingsLoading ? (
                    <div className="flex h-40 items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Manually map logos to {tab}s by selecting a logo for each {tab}.
                      </p>

                      <div className="rounded-md border">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-muted">
                              <th className="p-2 text-left">{tab.charAt(0).toUpperCase() + tab.slice(1)}</th>
                              <th className="p-2 text-left">Select Logo</th>
                              <th className="p-2 text-left">Preview</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entityList.map((entity) => (
                              <tr key={entity.name} className="border-b">
                                <td className="p-2">{entity.name}</td>
                                <td className="p-2">
                                  <Select
                                    value={selectedMappings[entity.name] || ""}
                                    onValueChange={(value) => handleMapLogo(entity.name, value)}
                                  >
                                    <SelectTrigger className="w-[250px]">
                                      <SelectValue placeholder="Select a logo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="no-logo">No logo</SelectItem>
                                      {images.map((image) => (
                                        <SelectItem key={image.url} value={image.url}>
                                          {image.pathname.split("/").pop()}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="p-2">
                                  {selectedMappings[entity.name] && selectedMappings[entity.name] !== "no-logo" ? (
                                    <div className="h-8 w-8 overflow-hidden rounded-full">
                                      <div className="relative h-full w-full">
                                        <Image
                                          src={selectedMappings[entity.name] || "/placeholder.svg"}
                                          alt={entity.name}
                                          fill
                                          className="object-contain"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">No logo</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </ClientOnly>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{tab.charAt(0).toUpperCase() + tab.slice(1)} Logo Matching</span>
                  <Button onClick={checkMatches} disabled={isCheckingMatches}>
                    {isCheckingMatches ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...
                      </>
                    ) : (
                      "Check Matches"
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClientOnly>
                  {Object.keys(entityLogos).length === 0 ? (
                    <p className="text-center text-muted-foreground">Click "Check Matches" to test logo matching</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-md border">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-muted">
                              <th className="p-2 text-left">{tab.charAt(0).toUpperCase() + tab.slice(1)}</th>
                              <th className="p-2 text-left">Logo Found</th>
                              <th className="p-2 text-left">Preview</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entityList.map((entity) => (
                              <tr key={entity.name} className="border-b">
                                <td className="p-2">{entity.name}</td>
                                <td className="p-2">
                                  {entityLogos[entity.name] ? (
                                    <span className="text-green-600">✓ Found</span>
                                  ) : (
                                    <span className="text-red-600">✗ Not found</span>
                                  )}
                                </td>
                                <td className="p-2">
                                  {entityLogos[entity.name] ? (
                                    <div className="h-8 w-8 overflow-hidden rounded-full">
                                      <div className="relative h-full w-full">
                                        <Image
                                          src={entityLogos[entity.name] || "/placeholder.svg"}
                                          alt={entity.name}
                                          fill
                                          className="object-contain"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">No logo</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </ClientOnly>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
