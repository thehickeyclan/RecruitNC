"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { Pencil, Trash2, Plus } from "lucide-react"

interface LogoMapping {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
  division?: string | null
  created_at: string
  updated_at: string
}

const DIVISION_OPTIONS = [
  { value: "none", label: "No Division" },
  { value: "NCAA D1", label: "NCAA Division I" },
  { value: "NCAA D2", label: "NCAA Division II" },
  { value: "NCAA D3", label: "NCAA Division III" },
  { value: "NAIA", label: "NAIA" },
  { value: "NJCAA", label: "NJCAA" },
  { value: "Other", label: "Other" },
]

export default function SimpleLogoManager() {
  const [logos, setLogos] = useState<LogoMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [editingLogo, setEditingLogo] = useState<LogoMapping | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Form state
  const [formName, setFormName] = useState("")
  const [formType, setFormType] = useState("college")
  const [formUrl, setFormUrl] = useState("")
  const [formDivision, setFormDivision] = useState("none")

  const loadLogos = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/logo-mappings-simple")
      const data = await response.json()
      if (data.success) {
        setLogos(data.data || [])
      } else {
        setMessage(`❌ Failed to load logos: ${data.error}`)
      }
    } catch (error) {
      console.error("Failed to load logos:", error)
      setMessage("❌ Failed to load logos")
    }
    setLoading(false)
  }

  const saveLogo = async () => {
    if (!formName || !formType || !formUrl) {
      setMessage("❌ Please fill in all required fields")
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setSaving(true)
    try {
      const method = editingLogo ? "PUT" : "POST"
      const body = editingLogo
        ? {
            id: editingLogo.id,
            entity_name: formName,
            entity_type: formType,
            logo_url: formUrl,
            division: formDivision,
          }
        : { entity_name: formName, entity_type: formType, logo_url: formUrl, division: formDivision }

      const response = await fetch("/api/logo-mappings-simple", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const result = await response.json()
      if (result.success) {
        setMessage(`✅ ${result.message || (editingLogo ? "Updated" : "Added")} ${formName}`)
        await loadLogos()
        resetForm()
        setShowAddDialog(false)
        setEditingLogo(null)
      } else {
        setMessage(`❌ Failed to save: ${result.error}`)
      }
    } catch (error) {
      console.error("Error saving logo:", error)
      setMessage(`❌ Error saving logo`)
    }
    setSaving(false)
    setTimeout(() => setMessage(null), 5000)
  }

  const deleteLogo = async (logo: LogoMapping) => {
    if (!confirm(`Delete logo for ${logo.entity_name}?`)) return

    setSaving(true)
    try {
      const response = await fetch("/api/logo-mappings-simple", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: logo.id }),
      })

      const result = await response.json()
      if (result.success) {
        setMessage(`✅ Deleted ${logo.entity_name}`)
        await loadLogos()
      } else {
        setMessage(`❌ Failed to delete: ${result.error}`)
      }
    } catch (error) {
      console.error("Error deleting logo:", error)
      setMessage(`❌ Error deleting logo`)
    }
    setSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }

  const resetForm = () => {
    setFormName("")
    setFormType("college")
    setFormUrl("")
    setFormDivision("none")
  }

  const startEdit = (logo: LogoMapping) => {
    setEditingLogo(logo)
    setFormName(logo.entity_name)
    setFormType(logo.entity_type)
    setFormUrl(logo.logo_url)
    setFormDivision(logo.division || "none")
  }

  const startAdd = () => {
    setEditingLogo(null)
    resetForm()
    setShowAddDialog(true)
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Logo Manager with Divisions</h1>
        <Button onClick={startAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Logo
        </Button>
      </div>

      {message && (
        <Alert className="mb-6">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        <div className="text-lg font-semibold">Logos ({logos.length})</div>

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
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs capitalize">
                      {logo.entity_type}
                    </Badge>
                    {logo.division && (
                      <Badge variant="secondary" className="text-xs">
                        {logo.division}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate max-w-md">{logo.logo_url}</p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => startEdit(logo)} variant="outline" size="sm" disabled={saving}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => deleteLogo(logo)} variant="outline" size="sm" disabled={saving}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {logos.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No logo mappings found. Add your first logo mapping above.
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={showAddDialog || editingLogo !== null}
        onOpenChange={() => {
          setShowAddDialog(false)
          setEditingLogo(null)
          resetForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLogo ? "Edit Logo" : "Add New Logo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Entity Name *" value={formName} onChange={(e) => setFormName(e.target.value)} />

            <Select value={formType} onValueChange={setFormType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="college">College</SelectItem>
                <SelectItem value="highschool">High School</SelectItem>
                <SelectItem value="club">Wrestling Club</SelectItem>
              </SelectContent>
            </Select>

            {formType === "college" && (
              <Select value={formDivision} onValueChange={setFormDivision}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Division" />
                </SelectTrigger>
                <SelectContent>
                  {DIVISION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Input placeholder="Logo URL *" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} />

            <div className="flex gap-2">
              <Button onClick={saveLogo} disabled={saving}>
                {saving ? "Saving..." : editingLogo ? "Update" : "Add"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false)
                  setEditingLogo(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
