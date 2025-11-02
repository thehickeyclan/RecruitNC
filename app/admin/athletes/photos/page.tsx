"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getAllAthletes } from "@/lib/athlete-service"
import AthletePhotoUpload from "@/components/athlete-photo-upload"
import type { Athlete } from "@/types/athlete"
import Link from "next/link"

export default function AthletePhotosPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)

  useEffect(() => {
    async function fetchAthletes() {
      try {
        setLoading(true)
        const data = await getAllAthletes()
        setAthletes(data)
      } catch (err) {
        console.error("Error fetching athletes:", err)
        setError("Failed to load athletes. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [])

  const filteredAthletes = athletes.filter(
    (athlete) =>
      athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (athlete.college && athlete.college.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (athlete.highSchool && athlete.highSchool.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const handlePhotoUploaded = (url: string) => {
    if (selectedAthlete) {
      // Update the local state to reflect the change
      setAthletes(
        athletes.map((athlete) =>
          athlete.id === selectedAthlete.id ? { ...athlete, commitmentPhotoUrl: url } : athlete,
        ),
      )
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Athlete Photos</h1>
        <Button variant="outline" asChild>
          <Link href="/admin/athletes">Back to Athletes</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Select Athlete</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  placeholder="Search athletes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                {loading ? (
                  <div className="text-center py-4">Loading athletes...</div>
                ) : error ? (
                  <div className="text-center text-red-500 py-4">{error}</div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto">
                    <ul className="space-y-2">
                      {filteredAthletes.map((athlete) => (
                        <li key={athlete.id}>
                          <Button
                            variant={selectedAthlete?.id === athlete.id ? "default" : "ghost"}
                            className="w-full justify-start text-left"
                            onClick={() => setSelectedAthlete(athlete)}
                          >
                            <div className="truncate">
                              <span className="font-medium">{athlete.name}</span>
                              <span className="text-sm text-gray-500 block">
                                {athlete.college} - {athlete.graduationYear || athlete.graduationyear}
                              </span>
                            </div>
                          </Button>
                        </li>
                      ))}
                      {filteredAthletes.length === 0 && (
                        <li className="text-center py-2 text-gray-500">No athletes found</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          {selectedAthlete ? (
            <AthletePhotoUpload
              athleteId={selectedAthlete.id}
              athleteName={selectedAthlete.name}
              onPhotoUploaded={handlePhotoUploaded}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <p className="text-gray-500">Select an athlete to upload photos</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
