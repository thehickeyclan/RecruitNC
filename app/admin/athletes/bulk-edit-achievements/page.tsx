"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import AthleteImage from "@/components/athlete-image"

interface Athlete {
  id: string
  name: string
  achievements: string[]
  highschool?: string
  college?: string
  photourl?: string
}

export default function BulkEditAchievementsPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    async function fetchAthletes() {
      try {
        const response = await fetch("/api/athletes")
        if (!response.ok) {
          throw new Error("Failed to fetch athletes")
        }

        const data = await response.json()

        // Handle the wrapped response format
        let athletesArray = data
        if (data && typeof data === "object" && data.athletes && Array.isArray(data.athletes)) {
          athletesArray = data.athletes
        } else if (data && data.data && Array.isArray(data.data)) {
          athletesArray = data.data
        }

        if (Array.isArray(athletesArray)) {
          setAthletes(athletesArray)
        } else {
          throw new Error("Invalid response format")
        }
      } catch (error) {
        console.error("Error fetching athletes:", error)
        toast({
          title: "Error",
          description: "Failed to load athletes",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [toast])

  const filteredAthletes = athletes.filter(
    (athlete) =>
      athlete?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete?.college?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete?.highschool?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage All Achievements</h1>
        <Button asChild variant="outline">
          <Link href="/admin/athletes">Back to Athletes</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Athletes & Their Achievements ({athletes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search athletes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="text-center py-10">Loading athletes...</div>
          ) : filteredAthletes.length === 0 ? (
            <div className="text-center py-10">
              {searchTerm ? "No athletes found matching your search" : "No athletes found"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Photo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>High School</TableHead>
                    <TableHead>College</TableHead>
                    <TableHead>Current Achievements</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAthletes.map((athlete) => (
                    <TableRow key={athlete.id}>
                      <TableCell>
                        <AthleteImage
                          photoUrl={athlete.photourl}
                          name={athlete.name}
                          size="sm"
                          alt={`${athlete.name || "Athlete"} photo`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{athlete.name || "N/A"}</TableCell>
                      <TableCell>{athlete.highschool || "N/A"}</TableCell>
                      <TableCell>{athlete.college || "N/A"}</TableCell>
                      <TableCell>
                        {athlete.achievements && athlete.achievements.length > 0 ? (
                          <div className="max-w-xs">
                            <ul className="text-sm space-y-1">
                              {athlete.achievements.slice(0, 3).map((achievement, index) => (
                                <li key={index} className="truncate">
                                  • {achievement}
                                </li>
                              ))}
                              {athlete.achievements.length > 3 && (
                                <li className="text-gray-500 italic">+{athlete.achievements.length - 3} more...</li>
                              )}
                            </ul>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">No achievements</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm">
                          <Link href={`/admin/athletes/edit-achievements/${athlete.id}`}>Edit Achievements</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
