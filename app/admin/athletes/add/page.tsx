"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AthleteForm } from "@/components/athlete-form"
import { useToast } from "@/components/ui/use-toast"
import { AdminHeader } from "@/components/admin-header"
import { createAthleteAction } from "@/lib/athlete-actions"

export default function AddAthletePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true)

    try {
      console.log("[v0] Using server action with data:", data)

      const result = await createAthleteAction(data)

      if (!result.success) {
        if ((result as { code?: string }).existingId && (result as { code?: string }).code === "DUPLICATE_ATHLETE") {
          const existingId = (result as { existingId?: string }).existingId
          toast({
            title: "Duplicate athlete",
            description: result.error + (existingId ? " You can edit the existing profile." : ""),
            variant: "destructive",
          })
          if (existingId) {
            window.location.href = `/admin/athletes/edit?id=${encodeURIComponent(existingId)}`
            return
          }
        }
        throw new Error(result.error)
      }

      console.log("[v0] Server action success:", result)

      toast({
        title: "Success",
        description: "Athlete added successfully",
      })

      window.location.href = "/admin/athletes"
    } catch (error) {
      console.error("[v0] Server action error:", error)

      toast({
        title: "Error adding athlete",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <AdminHeader
        title="Add New Athlete"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Athletes", href: "/admin/athletes" },
          { label: "Add", href: "/admin/athletes/add" },
        ]}
      />

      <div className="mt-6">
        <AthleteForm onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
