"use client"

import { SimpleLogoTest } from "@/components/simple-logo-test"

export default function SimpleEntityLogoTest() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Simple Entity Logo Test</h1>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">High School Logo</h2>
          <SimpleLogoTest entityType="highschool" entityName="Cardinal Gibbons High School" />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">College Logo</h2>
          <SimpleLogoTest entityType="college" entityName="UNC Chapel Hill" />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Club Logo</h2>
          <SimpleLogoTest entityType="club" entityName="RAW" />
        </div>
      </div>
    </div>
  )
}
