"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface Club {
  name: string
  logo_url?: string
  aliases?: string[]
}

interface SmartWrestlingClubInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SmartWrestlingClubInput({
  value,
  onChange,
  placeholder = "Select or enter wrestling club...",
  className,
}: SmartWrestlingClubInputProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([])

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const response = await fetch("/api/admin/clubs-from-logos")
        if (response.ok) {
          const data = await response.json()
          setClubs(data.clubs || [])
        } else {
          console.error("Failed to fetch clubs from logo mappings")
        }
      } catch (error) {
        console.error("Error fetching clubs:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchClubs()
  }, [])

  useEffect(() => {
    if (searchValue) {
      const filtered = clubs.filter((club) => {
        const nameMatch = club.name.toLowerCase().includes(searchValue.toLowerCase())
        const aliasMatch =
          club.aliases?.some((alias) => alias.toLowerCase().includes(searchValue.toLowerCase())) || false
        return nameMatch || aliasMatch
      })
      setFilteredClubs(filtered)
    } else {
      setFilteredClubs(clubs)
    }
  }, [searchValue, clubs])

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue)
    setOpen(false)
    setSearchValue("")
  }

  const handleCustomInput = (customValue: string) => {
    onChange(customValue)
    setSearchValue("")
  }

  if (loading) {
    return (
      <div className={cn("w-full", className)}>
        <Button variant="outline" disabled className="w-full justify-between bg-transparent">
          Loading wrestling clubs...
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-transparent"
          >
            {value || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search wrestling clubs..." value={searchValue} onValueChange={setSearchValue} />
            <CommandList>
              <CommandEmpty>
                <div className="p-2">
                  <p className="text-sm text-muted-foreground mb-2">No clubs found. Create a custom entry?</p>
                  <Button variant="outline" size="sm" onClick={() => handleCustomInput(searchValue)} className="w-full">
                    Add "{searchValue}"
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup heading="Wrestling Clubs">
                {filteredClubs.map((club) => (
                  <CommandItem key={club.name} value={club.name} onSelect={() => handleSelect(club.name)}>
                    <Check className={cn("mr-2 h-4 w-4", value === club.name ? "opacity-100" : "opacity-0")} />
                    {club.logo_url && (
                      <img
                        src={club.logo_url || "/placeholder.svg"}
                        alt={`${club.name} logo`}
                        className="mr-2 h-4 w-4 object-contain"
                      />
                    )}
                    {club.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              {searchValue && !filteredClubs.some((club) => club.name.toLowerCase() === searchValue.toLowerCase()) && (
                <CommandGroup heading="Custom Entry">
                  <CommandItem value={searchValue} onSelect={() => handleCustomInput(searchValue)}>
                    <Check className="mr-2 h-4 w-4 opacity-0" />
                    Add "{searchValue}"
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Alternative: Direct input field */}
      <div className="mt-2">
        <Input
          type="text"
          placeholder="Or type custom club name..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm"
        />
      </div>
    </div>
  )
}
