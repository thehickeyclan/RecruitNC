"use client"

import { useState, useEffect } from "react"
import { EntityLogo } from "@/components/entity-logo"

export default function LiamLogoTest() {
  const [apiTest, setApiTest] = useState<any>(null)
  const [liamData, setLiamData] = useState<any>(null)

  useEffect(() => {
    // Test the API directly
    fetch("/api/logo-mappings/college/UNC%20Chapel%20Hill")
      .then((res) => res.json())
      .then((data) => setApiTest(data))
      .catch((err) => setApiTest({ error: err.message }))

    // Get Liam's actual data
    fetch("/api/athletes/liam-hickey")
      .then((res) => res.json())
      .then((data) => setLiamData(data))
      .catch((err) => setLiamData({ error: err.message }))
  }, [])

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Liam Logo Debug</h1>

      {/* API Test */}
      <div className="bg-white p-4 rounded border">
        <h2 className="font-bold mb-2">Direct API Test</h2>
        <pre className="text-sm bg-gray-100 p-2 rounded">{JSON.stringify(apiTest, null, 2)}</pre>
      </div>

      {/* Liam's Data */}
      <div className="bg-white p-4 rounded border">
        <h2 className="font-bold mb-2">Liam's Actual Data</h2>
        <pre className="text-sm bg-gray-100 p-2 rounded">{JSON.stringify(liamData, null, 2)}</pre>
      </div>

      {/* Logo Tests */}
      <div className="bg-white p-4 rounded border">
        <h2 className="font-bold mb-4">Logo Component Tests</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm mb-2">entityType="college", entityName="UNC Chapel Hill"</p>
            <EntityLogo entityType="college" entityName="UNC Chapel Hill" size={48} />
          </div>
          <div>
            <p className="text-sm mb-2">category="college", name="UNC Chapel Hill"</p>
            <EntityLogo category="college" name="UNC Chapel Hill" size={48} />
          </div>
          <div>
            <p className="text-sm mb-2">entityType="high_school", entityName="Cardinal Gibbons"</p>
            <EntityLogo entityType="high_school" entityName="Cardinal Gibbons" size={48} />
          </div>
          <div>
            <p className="text-sm mb-2">entityType="club", entityName="RAW"</p>
            <EntityLogo entityType="club" entityName="RAW" size={48} />
          </div>
        </div>
      </div>

      {/* Manual Image Test */}
      <div className="bg-white p-4 rounded border">
        <h2 className="font-bold mb-2">Manual Image Test</h2>
        <img
          src="https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/Uigu95m8-1745952038636.png"
          alt="UNC Logo Direct"
          className="w-12 h-12 object-contain"
        />
      </div>
    </div>
  )
}
