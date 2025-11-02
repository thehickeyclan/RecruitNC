"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Props = {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function DivisionDropdown({ value, onValueChange, placeholder = "Select division", className }: Props) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="NCAA Division I">NCAA Division I</SelectItem>
        <SelectItem value="NCAA Division II">NCAA Division II</SelectItem>
        <SelectItem value="NCAA Division III">NCAA Division III</SelectItem>
        <SelectItem value="NAIA">NAIA</SelectItem>
        <SelectItem value="NJCAA">NJCAA</SelectItem>
        <SelectItem value="Independent">Independent</SelectItem>
      </SelectContent>
    </Select>
  )
}
