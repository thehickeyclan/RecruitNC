"use client"

import { useState } from "react"
import { EntityLogo } from "@/components/entity-logo"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CommitmentCardLogosDebug() {
  const [testEntities] = useState([
    { type: "college", name: "NC State University" },
    { type: "highschool", name: "Cardinal Gibbons High School" },
    { type: "club", name: "NC United Wrestling" },
    { type: "college", name: "University of North Carolina at Chapel Hill" },
    { type: "highschool", name: "Cary High School" },
  ])

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Entity Logo Debug Test</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {testEntities.map((entity, index) => (
          <Card key={index} className="p-4">
            <CardHeader>
              <CardTitle className="text-lg">{entity.name}</CardTitle>
              <p className="text-sm text-gray-600">Type: {entity.type}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Different sizes to test */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Size: xs (16px)</p>
                <EntityLogo
                  entityType={entity.type}
                  entityName={entity.name}
                  size="xs"
                  className="border border-gray-300 rounded"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Size: sm (24px)</p>
                <EntityLogo
                  entityType={entity.type}
                  entityName={entity.name}
                  size="sm"
                  className="border border-gray-300 rounded"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Size: md (32px)</p>
                <EntityLogo
                  entityType={entity.type}
                  entityName={entity.name}
                  size="md"
                  className="border border-gray-300 rounded"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Size: lg (48px)</p>
                <EntityLogo
                  entityType={entity.type}
                  entityName={entity.name}
                  size="lg"
                  className="border border-gray-300 rounded"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Size: 64px (custom)</p>
                <EntityLogo
                  entityType={entity.type}
                  entityName={entity.name}
                  size={64}
                  className="border border-gray-300 rounded"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">API Test Results</h2>
        <div className="bg-gray-100 p-4 rounded">
          <p className="text-sm">Check the browser console for detailed API logs.</p>
          <p className="text-sm mt-2">Expected results:</p>
          <ul className="text-sm mt-2 space-y-1">
            <li>✅ NC State University: Should load custom logo</li>
            <li>✅ Cardinal Gibbons High School: Should load custom logo</li>
            <li>⚠️ NC United Wrestling: Should show generic club fallback</li>
            <li>❓ UNC Chapel Hill: May or may not have logo</li>
            <li>❓ Cary High School: May or may not have logo</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
