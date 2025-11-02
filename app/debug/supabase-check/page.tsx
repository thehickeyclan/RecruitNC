"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function SupabaseCheckPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    checkSupabaseConnection()
  }, [])

  const checkSupabaseConnection = async () => {
    try {
      setStatus("loading")
      setMessage("Checking Supabase connection...")

      const supabase = createClientComponentClient()

      // Check if we can get the URL and anon key
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      setConfig({
        url: supabaseUrl ? "Set" : "Not set",
        anonKey: supabaseAnonKey ? "Set" : "Not set",
      })

      // Try a simple query
      const { data, error } = await supabase.from("athletes").select("id").limit(1)

      if (error) {
        throw new Error(`Supabase query error: ${error.message}`)
      }

      setStatus("success")
      setMessage(`Connection successful! Found ${data.length} athletes.`)
    } catch (err: any) {
      console.error("Supabase connection error:", err)
      setStatus("error")
      setMessage(`Connection error: ${err.message}`)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">Supabase Connection Check</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full ${
                  status === "loading" ? "bg-yellow-500" : status === "success" ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="font-medium">
                {status === "loading" ? "Checking..." : status === "success" ? "Connected" : "Connection Error"}
              </span>
            </div>

            <p>{message}</p>

            {config && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Configuration:</h3>
                <ul className="list-disc pl-5">
                  <li>NEXT_PUBLIC_SUPABASE_URL: {config.url}</li>
                  <li>NEXT_PUBLIC_SUPABASE_ANON_KEY: {config.anonKey}</li>
                </ul>
              </div>
            )}

            <Button onClick={checkSupabaseConnection} disabled={status === "loading"}>
              {status === "loading" ? "Checking..." : "Check Connection Again"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
