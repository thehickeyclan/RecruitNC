"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Edit, Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface InlineEditSectionProps {
  title: string
  icon?: React.ReactNode
  athleteId: string
  field: string
  value: string | number | null | undefined
  type?: "text" | "textarea" | "number"
  placeholder?: string
  onSave: (field: string, value: any) => Promise<void>
  canEdit?: boolean
  className?: string
}

export function InlineEditSection({
  title,
  icon,
  athleteId,
  field,
  value,
  type = "text",
  placeholder,
  onSave,
  canEdit = true,
  className = "",
}: InlineEditSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || "")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  if (!canEdit) {
    return null
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave(field, editValue)
      setIsEditing(false)
      toast({
        title: "Success",
        description: `${title} updated successfully`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value || "")
    setIsEditing(false)
  }

  return (
    <div className={`relative ${className}`}>
      {isEditing ? (
        <div className="space-y-2">
          {type === "textarea" ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              rows={4}
              className="w-full"
            />
          ) : (
            <Input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              className="w-full"
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="group flex items-center justify-between">
          <div className="flex-1">
            {value ? (
              <p className="text-gray-700">{value}</p>
            ) : (
              <p className="text-gray-400 italic">{placeholder || "Not set"}</p>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

