"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

export default function SetupEditRequestsTable() {
  const [isCreating, setIsCreating] = useState(false)
  const [result, setResult] = useState<string>("")
  const { toast } = useToast()

  const handleCreateTable = async () => {
    setIsCreating(true)
    setResult("")

    try {
      const response = await fetch("/api/run-script/create-edit-requests-table-fixed", {
        method: "POST",
      })

      const result = await response.json()

      if (response.ok) {
        setResult("✅ Edit requests table created successfully")
        toast({
          title: "Success",
          description: "Edit requests table created successfully",
        })
      } else {
        setResult(`❌ Error: ${result.error}`)
        toast({
          title: "Error",
          description: result.error || "Failed to create table",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating table:", error)
      const errorMessage = `❌ Network error: ${(error as Error).message}`
      setResult(errorMessage)
      toast({
        title: "Error",
        description: "Failed to create edit requests table",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDirectCreate = async () => {
    setIsCreating(true)
    setResult("")

    try {
      // Try to create table using direct API call
      const response = await fetch("/api/edit-requests/setup", {
        method: "POST",
      })

      const result = await response.json()

      if (response.ok) {
        setResult("✅ Table setup completed via direct method")
        toast({
          title: "Success",
          description: "Edit requests table setup completed",
        })
      } else {
        setResult(`❌ Direct method error: ${result.error}`)
      }
    } catch (error) {
      setResult(`❌ Direct method failed: ${(error as Error).message}`)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Setup Edit Requests Table</CardTitle>
          <CardDescription>Create the edit_requests table in the database</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={handleCreateTable}
              disabled={isCreating}
              className="bg-[#c8102e] hover:bg-[#a50d25] text-white"
            >
              {isCreating ? "Creating..." : "Create Edit Requests Table"}
            </Button>

            <Button onClick={handleDirectCreate} disabled={isCreating} variant="outline">
              {isCreating ? "Creating..." : "Try Direct Method"}
            </Button>
          </div>

          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <pre className="text-sm">{result}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
