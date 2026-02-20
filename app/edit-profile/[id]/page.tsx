"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save } from "lucide-react"

export default function EditProfilePage({ params }: { params: { id: string } }) {
  const [athlete, setAthlete] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    async function loadProfile() {
      try {
        // Check if user can edit
        const permissionResponse = await fetch(`/api/athletes/${params.id}/can-edit`)
        const permissionData = await permissionResponse.json()

        if (!permissionData.canEdit) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to edit this profile",
            variant: "destructive",
          })
          router.push(`/view-profile?id=${encodeURIComponent(params.id)}`)
          return
        }

        setCanEdit(true)

        // Load athlete data
        const response = await fetch(`/api/athletes/${params.id}`)
        const data = await response.json()

        if (data.success) {
          const athleteData = data.data
          if (athleteData.socialMedia) {
            try {
              const social =
                typeof athleteData.socialMedia === "string"
                  ? JSON.parse(athleteData.socialMedia)
                  : athleteData.socialMedia
              athleteData.instagram_handle = social?.instagram || social?.Instagram
              athleteData.twitter_handle = social?.twitter || social?.Twitter
            } catch (e) {
              console.error("[v0] Error parsing socialMedia:", e)
            }
          }
          setAthlete(athleteData)
        }
      } catch (error) {
        console.error("[v0] Error loading profile:", error)
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [params.id, router, toast])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    try {
      const formData = new FormData(e.currentTarget)
      const updates = {
        instagram_handle: formData.get("instagram_handle"),
        twitter_handle: formData.get("twitter_handle"),
        bio: formData.get("bio"),
        phone: formData.get("phone"),
        email: formData.get("email"),
      }

      const response = await fetch(`/api/athletes/${params.id}/update-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        })
        router.push(`/view-profile?id=${encodeURIComponent(params.id)}`)
      } else {
        throw new Error(data.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("[v0] Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!canEdit || !athlete) {
    return null
  }

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={() => router.push(`/view-profile?id=${encodeURIComponent(params.id)}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Profile
        </Button>
        <h1 className="text-3xl font-bold">Edit My Profile</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="instagram_handle">Instagram Handle</Label>
              <Input
                id="instagram_handle"
                name="instagram_handle"
                defaultValue={athlete.instagram_handle || ""}
                placeholder="@username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter_handle">Twitter Handle</Label>
              <Input
                id="twitter_handle"
                name="twitter_handle"
                defaultValue={athlete.twitter_handle || ""}
                placeholder="@username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={athlete.contactEmail || ""}
                placeholder="your.email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={athlete.phone || ""}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={athlete.bio || ""}
                placeholder="Tell us about yourself..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.push(`/view-profile?id=${encodeURIComponent(params.id)}`)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
