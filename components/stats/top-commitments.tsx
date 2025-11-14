"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MedalIcon } from "@/components/medal-icon"
import { EntityLogo } from "@/components/entity-logo"

interface TopEntity {
  id: string
  name: string
  count: number
  menCount?: number
  womenCount?: number
  logoUrl?: string
}

interface TopCommitmentsProps {
  topEntities: {
    colleges: TopEntity[]
    highSchools: TopEntity[]
    wrestlingClubs: TopEntity[]
  }
}

export function TopCommitments({ topEntities }: TopCommitmentsProps) {
  const [activeTab, setActiveTab] = useState("colleges")

  const getEntities = () => {
    switch (activeTab) {
      case "colleges":
        return topEntities.colleges.slice(0, 5)
      case "highSchools":
        return topEntities.highSchools.slice(0, 5)
      case "wrestlingClubs":
        return topEntities.wrestlingClubs.slice(0, 5)
      default:
        return []
    }
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="colleges" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="colleges">Top Colleges</TabsTrigger>
          <TabsTrigger value="highSchools">Top High Schools</TabsTrigger>
          <TabsTrigger value="wrestlingClubs">Top Wrestling Clubs</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4">
        {getEntities().map((entity, index) => (
          <Card key={entity.id || index} className="relative overflow-hidden">
            {index < 3 && <MedalIcon rank={index + 1} />}
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 overflow-hidden rounded-full">
                  <EntityLogo
                    entityType={
                      activeTab === "colleges"
                        ? "college"
                        : activeTab === "highSchools"
                          ? "highschool"
                          : "wrestlingclub"
                    }
                    entityName={entity.name}
                    size="sm"
                  />
                </div>
                <div>
                  <h3 className="font-medium">{entity.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {entity.count} {entity.count === 1 ? "athlete" : "athletes"}
                    {activeTab === "colleges" && entity.menCount !== undefined && entity.womenCount !== undefined && (
                      <span className="ml-1">
                        ({entity.menCount} men, {entity.womenCount} women)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
