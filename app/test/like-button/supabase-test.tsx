"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SupabaseTest() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [projectInfo, setProjectInfo] = useState<any>(null)
  const [envVars, setEnvVars] = useState<{ url?: string; key?: string }>({})

  useEffect(() => {
    async function checkConnection() {
      try {
        // Check if environment variables are set
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        setEnvVars({
          url: url ? "✅ Set" : "❌ Missing",
          key: key ? "✅ Set" : "❌ Missing",
        })

        if (!url || !key) {
          setStatus("error")
          setMessage("Supabase environment variables are missing")
          return
        }

        // Create Supabase client
        const supabase = createClient()

        // Simple query to test connection
        const { data, error } = await supabase.from("athletes").select("id").limit(1)

        if (error) {
          throw error
        }

        // Get project info
        const { data: projectData } = await supabase.rpc("get_project_info").catch(() => ({ data: null }))
        setProjectInfo(
          projectData || {
            project: url.replace("https://", "").replace(".supabase.co", ""),
          },
        )

        setStatus("success")
        setMessage("Successfully connected to Supabase!")
      } catch (error: any) {
        console.error("Supabase connection error:", error)
        setStatus("error")
        setMessage(error.message || "Failed to connect to Supabase")
      }
    }

    checkConnection()
  }, [])

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Supabase Connection Test</CardTitle>
        <CardDescription>Testing connection to your Supabase project</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "loading" && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {status === "success" && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{message}</AlertDescription>
          </Alert>
        )}

        {status === "error" && (
          <Alert variant="destructive">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2 mt-4">
          <h3 className="text-sm font-medium">Environment Variables</h3>
          <div className="text-sm">
            <p>NEXT_PUBLIC_SUPABASE_URL: {envVars.url}</p>
            <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {envVars.key}</p>
          </div>
        </div>

        {projectInfo && (
          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-medium">Project Information</h3>
            <div className="text-sm">
              <p>Project ID: {projectInfo.project}</p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
          Test Again
        </Button>
      </CardFooter>
    </Card>
  )
}
