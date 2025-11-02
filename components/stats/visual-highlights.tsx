"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { DivisionBreakdown } from "./division-breakdown"
import { CommitmentsOverTime } from "./commitments-over-time"
import { GenderComparison } from "./gender-comparison"
import { CommitmentVelocity } from "./commitment-velocity"
import { Button } from "@/components/ui/button"

export function VisualHighlights() {
  const [activeView, setActiveView] = useState<string>("overview")

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant={activeView === "overview" ? "default" : "outline"} onClick={() => setActiveView("overview")}>
          Overview
        </Button>
        <Button variant={activeView === "divisions" ? "default" : "outline"} onClick={() => setActiveView("divisions")}>
          Divisions
        </Button>
        <Button variant={activeView === "gender" ? "default" : "outline"} onClick={() => setActiveView("gender")}>
          Gender
        </Button>
        <Button variant={activeView === "velocity" ? "default" : "outline"} onClick={() => setActiveView("velocity")}>
          Velocity
        </Button>
      </div>

      <div className="mt-4">
        {activeView === "overview" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <CommitmentsOverTime />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <DivisionBreakdown />
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === "divisions" && (
          <Card>
            <CardContent className="pt-6">
              <DivisionBreakdown />
            </CardContent>
          </Card>
        )}

        {activeView === "gender" && (
          <Card>
            <CardContent className="pt-6">
              <GenderComparison />
            </CardContent>
          </Card>
        )}

        {activeView === "velocity" && (
          <Card>
            <CardContent className="pt-6">
              <CommitmentVelocity />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
