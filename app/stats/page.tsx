"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/components/auth-guard"
import { BarChart3, PieChart, TrendingUp, Calendar, Bell, Activity } from "lucide-react"
import Image from "next/image"

export default function StatsComingSoonPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin?redirect=/stats")
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
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="relative mx-auto w-32 h-32 mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <BarChart3 className="h-16 w-16 text-cyan-600" />
              </div>
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-4">Wrestling Analytics & Statistics</h1>
            <p className="text-xl text-gray-600 mb-6 max-w-3xl mx-auto">
              Dive deep into North Carolina wrestling data with comprehensive analytics, trends, and insights. Discover
              patterns in recruitment, performance metrics, and program success rates.
            </p>

            <Badge variant="secondary" className="text-lg px-6 py-2 bg-cyan-100 text-cyan-800">
              <Calendar className="h-4 w-4 mr-2" />
              Coming Soon
            </Badge>
          </div>

          {/* Preview Cards */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-12">
            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-cyan-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-blue-500" />
                  Commitment Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Detailed breakdown of college commitments by division, region, and timeline.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Division I</span>
                    <Badge variant="outline">45%</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Division II</span>
                    <Badge variant="outline">25%</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Division III</span>
                    <Badge variant="outline">30%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Trend Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Multi-year trends in wrestling participation and college placement rates.
                </p>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">+15%</div>
                  <div className="text-sm text-green-700">Growth in Commitments</div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-500" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Advanced statistics on program success and athlete development.</p>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Success Rate by School</li>
                  <li>• Weight Class Distribution</li>
                  <li>• Geographic Patterns</li>
                  <li>• Timeline Analysis</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Feature Preview */}
          <Card className="mb-12 overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/2 p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Data-Driven Wrestling Insights</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-cyan-600 rounded-full mt-2"></div>
                    <div>
                      <strong>Interactive Dashboards</strong>
                      <p className="text-gray-600 text-sm">
                        Dynamic charts and graphs showing wrestling trends and patterns
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-cyan-600 rounded-full mt-2"></div>
                    <div>
                      <strong>Predictive Analytics</strong>
                      <p className="text-gray-600 text-sm">
                        Forecast future trends in recruitment and program development
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-cyan-600 rounded-full mt-2"></div>
                    <div>
                      <strong>Custom Reports</strong>
                      <p className="text-gray-600 text-sm">Generate personalized statistics and analysis reports</p>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="md:w-1/2 bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center p-8">
                <Image
                  src="/diverse-group-athletes.png"
                  alt="Wrestling Statistics Preview"
                  width={400}
                  height={300}
                  className="rounded-lg shadow-lg"
                />
              </div>
            </div>
          </Card>

          {/* Notification Signup */}
          <Card className="text-center bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
            <CardContent className="p-8">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-90" />
              <h3 className="text-2xl font-bold mb-4">Unlock the Data</h3>
              <p className="mb-6 opacity-90">
                Get exclusive access to comprehensive wrestling analytics and statistical insights.
              </p>
              <Button variant="secondary" size="lg" className="bg-white text-cyan-600 hover:bg-gray-100">
                Access Analytics
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
