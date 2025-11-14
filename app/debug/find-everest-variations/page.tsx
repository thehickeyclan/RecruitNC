"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, User, AlertCircle } from 'lucide-react'

interface AthleteResult {
  id: string
  name: string
  firstName?: string
  lastName?: string
  college?: string
  highschool?: string
  wrestlingClub?: string
  graduationyear?: number
  weightclass?: string
  gender?: string
  photourl?: string
}

export default function FindEverestVariationsPage() {
  const [searchResults, setSearchResults] = useState<AthleteResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchComplete, setSearchComplete] = useState(false)

  const searchVariations = async () => {
    setIsSearching(true)
    setSearchComplete(false)
    
    try {
      const response = await fetch('/api/debug/find-everest-variations')
      const data = await response.json()
      
      setSearchResults(data.results || [])
      setSearchComplete(true)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Find Everest Variations</h1>
          <p className="text-gray-600">
            Searching for name variations like "Everrest", "OUellete", etc.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search for Name Variations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p><strong>Searching for variations of:</strong></p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Everest Ouellette</li>
                  <li>Everrest Ouellette</li>
                  <li>Everest OUellete</li>
                  <li>Everrest OUellete</li>
                  <li>Any name containing "Ever" + "Ouel"</li>
                </ul>
              </div>
              
              <Button 
                onClick={searchVariations} 
                disabled={isSearching}
                className="w-full"
              >
                {isSearching ? "Searching..." : "Search All Variations"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {searchComplete && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Search Results ({searchResults.length} found)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No variations found</p>
                  <p className="text-sm text-gray-500 mt-2">
                    The athlete might be under a completely different name
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {searchResults.map((athlete) => (
                    <div key={athlete.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-blue-600">
                            {athlete.name}
                          </h3>
                          
                          <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                            <div>
                              <p><strong>ID:</strong> {athlete.id}</p>
                              <p><strong>First Name:</strong> {athlete.firstName || 'N/A'}</p>
                              <p><strong>Last Name:</strong> {athlete.lastName || 'N/A'}</p>
                            </div>
                            <div>
                              <p><strong>Graduation:</strong> {athlete.graduationyear || 'N/A'}</p>
                              <p><strong>Weight:</strong> {athlete.weightclass || 'N/A'}</p>
                              <p><strong>Gender:</strong> {athlete.gender || 'N/A'}</p>
                            </div>
                          </div>

                          <div className="mt-3 space-y-2">
                            {athlete.college && (
                              <div>
                                <Badge variant="outline" className="bg-blue-50">
                                  College: {athlete.college}
                                </Badge>
                              </div>
                            )}
                            
                            {athlete.highschool && (
                              <div>
                                <Badge variant="outline" className="bg-green-50">
                                  High School: {athlete.highschool}
                                </Badge>
                              </div>
                            )}
                            
                            {athlete.wrestlingClub && (
                              <div>
                                <Badge variant="outline" className="bg-orange-50">
                                  <strong>Wrestling Club: {athlete.wrestlingClub}</strong>
                                </Badge>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => window.open(`/athletes/${athlete.id}`, '_blank')}
                            >
                              View Profile
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => window.open(`/admin/athletes/edit/${athlete.id}`, '_blank')}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>

                        {athlete.photourl && (
                          <div className="ml-4">
                            <img 
                              src={athlete.photourl || "/placeholder.svg"} 
                              alt={athlete.name}
                              className="w-16 h-16 rounded-lg object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/diverse-wrestlers.png';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
