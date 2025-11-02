"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function PopulateLogoMappings() {
  const [entityName, setEntityName] = useState("")
  const [entityType, setEntityType] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/logo-mappings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entityName,
          entityType,
          logoUrl,
        }),
      })

      if (response.ok) {
        setMessage(`✅ Successfully added logo mapping for ${entityName}`)
        setEntityName("")
        setLogoUrl("")
      } else {
        const error = await response.text()
        setMessage(`❌ Error: ${error}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const quickMappings = [
    {
      name: "UNC Chapel Hill",
      type: "college",
      url: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/Uigu95m8-1745952038636.png",
    },
    {
      name: "Cardinal Gibbons",
      type: "highschool",
      url: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/highschool/cardinal-gibbons-crest.png",
    },
    {
      name: "RAW",
      type: "club",
      url: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/club/entity-1746060380468.png",
    },
  ]

  const handleQuickAdd = async (mapping: any) => {
    setIsLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/logo-mappings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entityName: mapping.name,
          entityType: mapping.type,
          logoUrl: mapping.url,
        }),
      })

      if (response.ok) {
        setMessage(`✅ Successfully added logo mapping for ${mapping.name}`)
      } else {
        const error = await response.text()
        setMessage(`❌ Error: ${error}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Populate Logo Mappings</h1>

      {/* Quick Add Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Quick Add Common Logos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quickMappings.map((mapping, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded">
                <div>
                  <strong>{mapping.name}</strong> ({mapping.type})
                  <br />
                  <small className="text-gray-500">{mapping.url}</small>
                </div>
                <Button onClick={() => handleQuickAdd(mapping)} disabled={isLoading}>
                  Add Mapping
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manual Add Section */}
      <Card>
        <CardHeader>
          <CardTitle>Add Custom Logo Mapping</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="entityName">Entity Name</Label>
              <Input
                id="entityName"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                placeholder="e.g., UNC Chapel Hill"
                required
              />
            </div>

            <div>
              <Label htmlFor="entityType">Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="college">College</SelectItem>
                  <SelectItem value="highschool">High School</SelectItem>
                  <SelectItem value="club">Club</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/..."
                required
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Logo Mapping"}
            </Button>
          </form>

          {message && <div className="mt-4 p-4 rounded bg-gray-100">{message}</div>}
        </CardContent>
      </Card>
    </div>
  )
}
