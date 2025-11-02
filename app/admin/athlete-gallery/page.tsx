"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Search, RefreshCw, User, UserCheck, UserX } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface Athlete {
  id: string
  name: string
  photourl?: string
  highschool: string
  college: string
  division?: string
}

export default function AthleteGalleryPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [filteredAthletes, setFilteredAthletes] = useState<Athlete[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"all" | "with-photos" | "without-photos">("all")
  const { toast } = useToast()

  useEffect(() => {
    loadAthletes()
  }, [])

  useEffect(() => {
    filterAthletes()
  }, [searchTerm, athletes, activeTab])

  const loadAthletes = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/athletes")
      if (!response.ok) {
        throw new Error("Failed to fetch athletes")
      }
      const data = await response.json()
      setAthletes(data)
    } catch (error) {
      console.error("Error loading athletes:", error)
      toast({
        title: "Failed to load athletes",
        description: "There was an error loading the athletes list",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filterAthletes = () => {
    let filtered = [...athletes]

    // Filter by tab
    if (activeTab === "with-photos") {
      filtered = filtered.filter((athlete) => athlete.photourl)
    } else if (activeTab === "without-photos") {
      filtered = filtered.filter((athlete) => !athlete.photourl)
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (athlete) =>
          athlete.name.toLowerCase().includes(term) ||
          athlete.highschool?.toLowerCase().includes(term) ||
          athlete.college?.toLowerCase().includes(term),
      )
    }

    setFilteredAthletes(filtered)
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Athlete Photo Gallery</h1>
        <Button onClick={loadAthletes} variant="outline" className="self-start">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Athletes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search athletes, high schools, or colleges..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Tabs
              defaultValue="all"
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as any)}
              className="w-full md:w-auto"
            >
              <TabsList>
                <TabsTrigger value="all" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  All
                </TabsTrigger>
                <TabsTrigger value="with-photos" className="flex items-center">
                  <UserCheck className="mr-2 h-4 w-4" />
                  With Photos
                </TabsTrigger>
                <TabsTrigger value="without-photos" className="flex items-center">
                  <UserX className="mr-2 h-4 w-4" />
                  Missing Photos
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredAthletes.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No athletes found matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredAthletes.map((athlete) => (
            <Card key={athlete.id} className="overflow-hidden">
              <div className="aspect-square relative">
                {athlete.photourl ? (
                  <Image
                    src={athlete.photourl || "/placeholder.svg"}
                    alt={athlete.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <User className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
              <CardContent className="p-3">
                <h3 className="font-medium truncate">{athlete.name}</h3>
                <p className="text-xs text-gray-500 truncate">
                  {athlete.highschool} → {athlete.college}
                </p>
                <div className="flex items-center justify-between mt-2">
                  {athlete.division && (
                    <Badge variant="outline" className="text-xs">
                      {athlete.division}
                    </Badge>
                  )}
                  <Button asChild size="sm" className="ml-auto">
                    <Link href={`/admin/athletes/update-image/${athlete.id}`}>Update</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 text-center text-sm text-gray-500">
        Showing {filteredAthletes.length} of {athletes.length} athletes
      </div>
    </div>
  )
}
