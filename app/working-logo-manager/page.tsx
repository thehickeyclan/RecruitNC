"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"

interface LogoMapping {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
  created_at: string
  updated_at: string
}

export default function WorkingLogoManager() {
  const [logos, setLogos] = useState<LogoMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // New logo form
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState("college")
  const [newUrl, setNewUrl] = useState("")

  const loadLogos = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/test-logo-read")
      const data = await response.json()
      if (data.success) {
        setLogos(data.data || [])
      }
    } catch (error) {
      console.error("Failed to load logos:", error)
    }
    setLoading(false)
  }

  const saveLogo = async (entity_name: string, entity_type: string, logo_url: string) => {
    setSaving(`${entity_name}-${entity_type}`)
    try {
      const response = await fetch("/api/test-logo-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_name, entity_type, logo_url }),
      })

      const result = await response.json()
      if (result.success) {
        setMessage(`✅ Saved ${entity_name}`)
        await loadLogos() // Reload to show changes
      } else {
        setMessage(`❌ Failed to save ${entity_name}: ${result.error}`)
      }
    } catch (error) {
      setMessage(`❌ Error saving ${entity_name}`)
    }
    setSaving(null)
    setTimeout(() => setMessage(null), 3000)
  }

  const addNewLogo = async () => {
    if (!newName || !newType || !newUrl) {
      setMessage("❌ Please fill in all fields")
      setTimeout(() => setMessage(null), 3000)
      return
    }

    await saveLogo(newName, newType, newUrl)
    setNewName("")
    setNewUrl("")
  }

  useEffect(() => {
    loadLogos()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">Loading logos...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Working Logo Manager</h1>

      {message && (
        <Alert className="mb-6">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Add New Logo */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add New Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input placeholder="Entity Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="college">College</SelectItem>
                <SelectItem value="highschool">High School</SelectItem>
                <SelectItem value="club">Wrestling Club</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Logo URL" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
            <Button onClick={addNewLogo} disabled={saving !== null}>
              Add Logo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Logos */}
      <div className="grid gap-4">
        <h2 className="text-2xl font-semibold">Existing Logos ({logos.length})</h2>

        {logos.map((logo) => (
          <Card key={logo.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 border rounded overflow-hidden bg-gray-50">
                  <Image
                    src={logo.logo_url || "/placeholder.svg"}
                    alt={logo.entity_name}
                    width={64}
                    height={64}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg"
                    }}
                  />
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold">{logo.entity_name}</h3>
                  <p className="text-sm text-gray-600">{logo.entity_type}</p>
                  <p className="text-xs text-gray-400 truncate">{logo.logo_url}</p>
                </div>

                <Button
                  onClick={() => saveLogo(logo.entity_name + " Updated", logo.entity_type, logo.logo_url)}
                  disabled={saving === `${logo.entity_name}-${logo.entity_type}`}
                  variant="outline"
                  size="sm"
                >
                  {saving === `${logo.entity_name}-${logo.entity_type}` ? "Saving..." : "Test Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
