"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Mail, Shield, Instagram, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ContactInfoSectionProps {
  athlete: {
    phone?: string
    contactEmail?: string
    socialMedia?: string | object
    email?: string
    email_address?: string
    emailAddress?: string
    contact_email?: string
    instagram?: string
    instagram_handle?: string
    instagram_username?: string
    social_instagram?: string
    name?: string
    wrestling_name?: string
    first_name?: string
    firstName?: string
    last_name?: string
    lastName?: string
  }
}

export function ContactInfoSection({ athlete }: ContactInfoSectionProps) {
  const { isAdmin, isVerifiedCoach, isCoach } = useAuth()
  const [isExpanded, setIsExpanded] = useState(true)

  if (!isAdmin && !isVerifiedCoach) {
    return null
  }

  const phone = athlete.phone
  const email =
    athlete.contactEmail || athlete.email || athlete.email_address || athlete.emailAddress || athlete.contact_email

  let instagram =
    athlete.instagram || athlete.instagram_handle || athlete.instagram_username || athlete.social_instagram

  if (!instagram && athlete.socialMedia) {
    try {
      if (typeof athlete.socialMedia === "string") {
        const socialData = JSON.parse(athlete.socialMedia)
        instagram = socialData.instagram || socialData.Instagram
      } else if (typeof athlete.socialMedia === "object") {
        const socialData = athlete.socialMedia as any
        instagram = socialData.instagram || socialData.Instagram
      }
    } catch (e) {
      if (typeof athlete.socialMedia === "string" && athlete.socialMedia.includes("instagram")) {
        instagram = athlete.socialMedia
      }
    }
  }

  const athleteName =
    athlete.wrestling_name ||
    athlete.name ||
    `${athlete.first_name || athlete.firstName || ""} ${athlete.last_name || athlete.lastName || ""}`.trim() ||
    "Athlete"

  if (!phone && !email && !instagram) {
    return null
  }

  return (
    <div className="my-8">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="bg-blue-900 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Contact Information
              <span className="text-sm font-normal text-yellow-400">(Only visible to college coaches)</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-white hover:bg-blue-800"
            >
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 font-medium mb-3">Contact details for {athleteName}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Phone className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Cell Phone</p>
                        <p className="font-semibold text-gray-900">
                          <a href={`tel:${phone}`} className="hover:text-blue-600 transition-colors">
                            {phone}
                          </a>
                        </p>
                      </div>
                    </div>
                  )}

                  {email && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Mail className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-semibold text-gray-900">
                          <a href={`mailto:${email}`} className="hover:text-blue-600 transition-colors">
                            {email}
                          </a>
                        </p>
                      </div>
                    </div>
                  )}

                  {instagram && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Instagram className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Instagram</p>
                        <p className="font-semibold text-gray-900">
                          <a
                            href={`https://www.instagram.com/${instagram.replace("@", "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 transition-colors"
                          >
                            @{instagram.replace("@", "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "")}
                          </a>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-700">
                  <Shield className="h-3 w-3 inline mr-1" />
                  This contact information is only visible to verified coaches and administrators.
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
