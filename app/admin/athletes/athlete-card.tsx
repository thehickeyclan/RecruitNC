"use client"

import Link from "next/link"
import { useState } from "react"
import { MoreHorizontal, Eye, Pencil, ImageIcon, Trash2, MapPin, GraduationCap, Scale } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import AthleteImage from "@/components/athlete-image"

interface AthleteCardProps {
  athlete: {
    id: string
    name: string
    photourl?: string | null
    highschool?: string | null
    state?: string | null
    state_abbreviation?: string | null
    hometown_state?: string | null
    college?: string | null
    division?: string | null
    weightclass?: string | null
    graduationyear?: number | null
    recruiting_status?: string | null
    commitmentdate?: string | null
  }
  isSelected: boolean
  onToggleSelect: (id: string) => void
  onDelete: (id: string, name: string) => void
}

export function AthleteCard({ athlete, isSelected, onToggleSelect, onDelete }: AthleteCardProps) {
  const [imageError, setImageError] = useState(false)
  
  const stateDisplay = athlete.state || athlete.state_abbreviation || athlete.hometown_state
  
  const getStatusColor = (status?: string | null) => {
    if (!status) return "bg-white/10 text-white/60"
    const lower = status.toLowerCase()
    if (lower === "committed" || lower === "college athlete") {
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    }
    if (lower === "uncommitted") {
      return "bg-amber-500/20 text-amber-400 border-amber-500/30"
    }
    return "bg-white/10 text-white/60 border-white/20"
  }

  return (
    <div 
      className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ${
        isSelected 
          ? "border-[#C8A94A] bg-[#C8A94A]/5" 
          : "border-white/10 bg-[#0B2545]/50 hover:border-white/20 hover:bg-[#0B2545]/70"
      }`}
    >
      {/* Selection checkbox */}
      <div className="absolute left-3 top-3 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(athlete.id)}
          className="h-5 w-5 border-white/30 data-[state=checked]:border-[#C8A94A] data-[state=checked]:bg-[#C8A94A]"
          aria-label={`Select ${athlete.name || "athlete"}`}
        />
      </div>

      {/* Actions menu */}
      <div className="absolute right-3 top-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 bg-black/40 text-white/70 backdrop-blur-sm hover:bg-black/60 hover:text-white"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 border-white/10 bg-[#061224] text-white">
            <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white">
              <Link href={`/view-profile?id=${encodeURIComponent(athlete.id)}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white">
              <Link href={`/admin/athletes/edit?id=${encodeURIComponent(athlete.id)}`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white">
              <Link href={`/admin/athletes/images/${athlete.id}`}>
                <ImageIcon className="mr-2 h-4 w-4" />
                Manage Images
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem 
              onClick={() => onDelete(athlete.id, athlete.name || "this athlete")}
              className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Card content */}
      <Link 
        href={`/view-profile?id=${encodeURIComponent(athlete.id)}`}
        className="block"
      >
        {/* Photo section */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-b from-[#0B2545] to-[#061224]">
          <AthleteImage
            photoUrl={athlete.photourl}
            name={athlete.name}
            fill
            alt={`${athlete.name || "Athlete"} photo`}
            className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#061224] via-transparent to-transparent" />
          
          {/* Weight class badge */}
          {athlete.weightclass && (
            <div className="absolute bottom-3 left-3">
              <Badge className="border-0 bg-[#C8A94A] px-2 py-1 text-xs font-bold text-[#061224]">
                {athlete.weightclass} lbs
              </Badge>
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="p-4">
          {/* Name and status */}
          <div className="mb-3 flex items-start justify-between gap-2">
            <h3 className="text-lg font-bold leading-tight text-white">
              {athlete.name || "Unknown Athlete"}
            </h3>
          </div>

          {/* Recruiting status */}
          <div className="mb-3">
            <Badge 
              variant="outline" 
              className={`text-xs font-semibold ${getStatusColor(athlete.recruiting_status)}`}
            >
              {athlete.recruiting_status || "Unknown"}
            </Badge>
          </div>

          {/* Meta info */}
          <div className="space-y-1.5 text-sm text-white/60">
            {athlete.highschool && (
              <div className="flex items-center gap-2">
                <GraduationCap className="h-3.5 w-3.5 shrink-0 text-white/40" />
                <span className="truncate">{athlete.highschool}</span>
              </div>
            )}
            
            {stateDisplay && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-white/40" />
                <span>{stateDisplay}</span>
              </div>
            )}

            {athlete.graduationyear && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#C8A94A]">Class of {athlete.graduationyear}</span>
              </div>
            )}
          </div>

          {/* College commitment */}
          {athlete.college && (
            <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
              <p className="text-xs font-medium text-emerald-400">
                {athlete.division && <span className="text-white/50">{athlete.division} · </span>}
                {athlete.college}
              </p>
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}
