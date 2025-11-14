"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DivisionBreakdown } from "./division-breakdown"
import { CommitmentsOverTime } from "./commitments-over-time"
import { GenderComparison } from "./gender-comparison"
import { CommitmentVelocity } from "./commitment-velocity"

export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="space-y-4">
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="divisions">Divisions</TabsTrigger>
          <TabsTrigger value="gender">Gender</TabsTrigger>
          <TabsTrigger value="velocity">Velocity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <CommitmentsOverTime />
            <DivisionBreakdown />
          </div>
        </TabsContent>

        <TabsContent value="divisions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Division Analysis</CardTitle>
              <CardDescription>Detailed breakdown of commitments by NCAA division</CardDescription>
            </CardHeader>
            <CardContent>
              <DivisionBreakdown />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gender" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Gender Analysis</CardTitle>
              <CardDescription>Comparing men's and women's wrestling commitments</CardDescription>
            </CardHeader>
            <CardContent>
              <GenderComparison />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="velocity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Commitment Velocity</CardTitle>
              <CardDescription>Analyzing the rate of commitments over time</CardDescription>
            </CardHeader>
            <CardContent>
              <CommitmentVelocity />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
