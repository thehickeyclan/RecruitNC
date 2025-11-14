"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function StatsFilters() {
  const [filtersVisible, setFiltersVisible] = useState(false)

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={() => setFiltersVisible(!filtersVisible)}>
        {filtersVisible ? "Hide Filters" : "Show Filters"}
      </Button>

      {filtersVisible && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="year">Graduation Year</Label>
                <Select defaultValue="all">
                  <SelectTrigger id="year">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="division">NCAA Division</Label>
                <Select defaultValue="all">
                  <SelectTrigger id="division">
                    <SelectValue placeholder="All Divisions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    <SelectItem value="d1">Division I</SelectItem>
                    <SelectItem value="d2">Division II</SelectItem>
                    <SelectItem value="d3">Division III</SelectItem>
                    <SelectItem value="naia">NAIA</SelectItem>
                    <SelectItem value="juco">JUCO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select defaultValue="all">
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="All Genders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="men">Men</SelectItem>
                    <SelectItem value="women">Women</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Select defaultValue="all">
                  <SelectTrigger id="region">
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    <SelectItem value="charlotte">Charlotte Metro</SelectItem>
                    <SelectItem value="triangle">Triangle</SelectItem>
                    <SelectItem value="triad">Triad</SelectItem>
                    <SelectItem value="western">Western NC</SelectItem>
                    <SelectItem value="eastern">Eastern NC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline">Reset</Button>
              <Button>Apply Filters</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
