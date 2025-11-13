"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Award, Users, TrendingUp, CheckCircle, FileText, Search } from "lucide-react"

export default function ProspectsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#002147] to-[#003366] text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">NC Wrestling Prospects</h1>
            <p className="text-xl text-gray-200 mb-8">
              Connecting North Carolina&apos;s top wrestling talent with college programs
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center">
              <Link href="/submit-profile">
                <Button size="lg" className="bg-[#B31B1B] text-white hover:bg-[#8B1515] w-full sm:w-auto shadow-lg">
                  <FileText className="h-5 w-5 mr-2" />
                  Submit Your Profile
                </Button>
              </Link>
              <Link href="/public-rankings">
                <Button size="lg" className="bg-white text-[#002147] hover:bg-gray-100 w-full sm:w-auto shadow-lg">
                  <Search className="h-5 w-5 mr-2" />
                  Browse Rankings
                </Button>
              </Link>
              <Link href="/prospects/all">
                <Button
                  size="lg"
                  className="bg-[#D3B574] text-[#03154C] hover:bg-[#c4a151] w-full sm:w-auto shadow-lg font-semibold"
                >
                  <Users className="h-5 w-5 mr-2" />
                  View All NC Prospects
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Why Submit Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Submit Your Prospect Profile?</h2>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card>
              <CardHeader>
                <div className="h-12 w-12 bg-[#002147]/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-[#002147]" />
                </div>
                <CardTitle>College Exposure</CardTitle>
                <CardDescription>
                  Get your profile in front of college coaches actively recruiting North Carolina wrestlers
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 bg-[#B31B1B]/10 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-[#B31B1B]" />
                </div>
                <CardTitle>Track Your Progress</CardTitle>
                <CardDescription>
                  Showcase your achievements, academics, and tournament results in one comprehensive profile
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 bg-[#CBAF5D]/20 rounded-lg flex items-center justify-center mb-4">
                  <Award className="h-6 w-6 text-[#CBAF5D]" />
                </div>
                <CardTitle>State Recognition</CardTitle>
                <CardDescription>
                  Join North Carolina&apos;s official wrestling prospects database and rankings
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* How It Works */}
          <Card className="bg-gradient-to-br from-[#002147]/5 to-white border-[#002147]/20">
            <CardHeader>
              <CardTitle className="text-2xl">How It Works</CardTitle>
              <CardDescription>Simple 3-step process to get your profile live</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 h-10 w-10 bg-[#002147] text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Submit Your Profile</h3>
                    <p className="text-gray-600">
                      Fill out the comprehensive prospect form with your wrestling achievements, academics, tournament
                      results, and contact information. The more complete your profile, the better!
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 h-10 w-10 bg-[#B31B1B] text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Admin Review</h3>
                    <p className="text-gray-600">
                      Our team reviews your submission within 2-3 business days to verify accuracy and completeness.
                      You&apos;ll receive an email notification once reviewed.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 h-10 w-10 bg-[#CBAF5D] text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Go Live</h3>
                    <p className="text-gray-600">
                      Once approved, your profile goes live on our prospects page where college coaches can discover
                      you, track your progress, and add you to their recruiting pipelines.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What to Include */}
          <div className="mt-12">
            <h3 className="text-2xl font-bold mb-6 text-center">What Information to Include</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Wrestling Credentials
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• Career record</li>
                    <li>• State, regional, conference achievements</li>
                    <li>• National tournament results (Super 32, NHSCA)</li>
                    <li>• Nationally ranked wins</li>
                    <li>• College opens experience</li>
                    <li>• High school and club affiliations</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    Academic &amp; Contact Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• GPA (4.0 scale)</li>
                    <li>• SAT/ACT scores</li>
                    <li>• Intended major/academic interests</li>
                    <li>• Contact email and phone</li>
                    <li>• Social media handles (optional)</li>
                    <li>• Highlight video (optional)</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-16 text-center" id="all-nc-prospects">
            <div className="bg-[#B31B1B] rounded-lg p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">Ready to Get Recruited?</h3>
              <p className="text-red-100 mb-6 max-w-2xl mx-auto">
                Join hundreds of North Carolina wrestlers who have submitted their profiles and connected with college
                programs. It takes about 10 minutes to complete your profile.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center">
                <Link href="/submit-profile">
                  <Button size="lg" className="bg-white text-[#B31B1B] hover:bg-gray-100 w-full sm:w-auto">
                    <FileText className="h-5 w-5 mr-2" />
                    Submit Your Profile Now
                  </Button>
                </Link>
                <Link href="/public-rankings">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white bg-white text-[#002147] hover:bg-gray-100 w-full sm:w-auto"
                  >
                    <Search className="h-5 w-5 mr-2" />
                    Browse Rankings
                  </Button>
                </Link>
                <Link href="/prospects/all">
                  <Button
                    size="lg"
                    className="bg-[#D3B574] text-[#03154C] hover:bg-[#c4a151] w-full sm:w-auto font-semibold"
                  >
                    <Users className="h-5 w-5 mr-2" />
                    View All NC Prospects
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

