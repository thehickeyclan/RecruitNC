"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/components/auth-guard"
import { Users, Target, Calendar, Bell, Star, Zap } from "lucide-react"
import Image from "next/image"

export default function ClubsComingSoonPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin?redirect=/clubs")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="relative mx-auto w-32 h-32 mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <Users className="h-16 w-16 text-purple-600" />
              </div>
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-4">Wrestling Clubs & Training Centers</h1>
            <p className="text-xl text-gray-600 mb-6 max-w-3xl mx-auto">
              Discover elite wrestling clubs and training centers across North Carolina. Find year-round training
              opportunities, specialized coaching, and pathways to collegiate success.
            </p>

            <Badge variant="secondary" className="text-lg px-6 py-2 bg-purple-100 text-purple-800">
              <Calendar className="h-4 w-4 mr-2" />
              Coming Soon
            </Badge>
          </div>

          {/* Preview Cards */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-12">
            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-500" />
                  Elite Training
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Premier wrestling clubs offering specialized training and development programs.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Elite Clubs</span>
                    <Badge variant="outline">25+ Programs</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Youth Programs</span>
                    <Badge variant="outline">40+ Clubs</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Training Centers</span>
                    <Badge variant="outline">15+ Facilities</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Success Stories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Track club alumni success at the collegiate and international levels.
                </p>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">150+</div>
                  <div className="text-sm text-blue-700">Club Athletes Committed</div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-green-500" />
                  Club Profiles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Detailed information about coaching staff, facilities, and training philosophy.
                </p>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Coaching Credentials</li>
                  <li>• Training Schedules</li>
                  <li>• Competition Teams</li>
                  <li>• Facility Information</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Feature Preview */}
          <Card className="mb-12 overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/2 p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Find Your Training Home</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                    <div>
                      <strong>Club Directory</strong>
                      <p className="text-gray-600 text-sm">
                        Comprehensive listing of wrestling clubs by location and specialty
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                    <div>
                      <strong>Coach Profiles</strong>
                      <p className="text-gray-600 text-sm">Learn about coaching staff backgrounds and achievements</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                    <div>
                      <strong>Alumni Network</strong>
                      <p className="text-gray-600 text-sm">See where club wrestlers are competing in college</p>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="md:w-1/2 bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center p-8">
                <Image
                  src="/grappling-duel.png"
                  alt="Wrestling Clubs Preview"
                  width={400}
                  height={300}
                  className="rounded-lg shadow-lg"
                />
              </div>
            </div>
          </Card>

          {/* Notification Signup */}
          <Card className="text-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
            <CardContent className="p-8">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-90" />
              <h3 className="text-2xl font-bold mb-4">Join the Club Network</h3>
              <p className="mb-6 opacity-90">
                Get exclusive access to our wrestling club directory and training resources.
              </p>
              <Button variant="secondary" size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
                Connect with Clubs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
