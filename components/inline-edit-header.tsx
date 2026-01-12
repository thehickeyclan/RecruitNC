"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"

interface InlineEditHeaderProps {
  title: string
  icon?: React.ReactNode
  canEdit?: boolean
  onEdit?: () => void
  children?: React.ReactNode
}

export function InlineEditHeader({
  title,
  icon,
  canEdit = true,
  onEdit,
  children,
}: InlineEditHeaderProps) {
  if (!canEdit) {
    return (
      <div className="bg-gradient-to-r from-[#002147] to-[#003366] p-6">
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-2xl font-bold text-white">{title}</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-[#002147] to-[#003366] p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-2xl font-bold text-white">{title}</h2>
        </div>
        {onEdit && (
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
        {children}
      </div>
    </div>
  )
}

