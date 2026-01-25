import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthGuard } from "@/components/auth-guard"

export default function AboutPage() {
  return (
    <AuthGuard>
      <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">About NC United Wrestling Portal</h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Our Mission</CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <p>
                The NC United Wrestling Portal is dedicated to celebrating and promoting the achievements of North
                Carolina's wrestling talent. Our mission is to create a comprehensive resource that showcases the
                state's wrestlers and their college commitments, providing valuable insights for athletes, coaches,
                recruiters, and fans.
              </p>
              <p>
                We believe in the power of recognition and information to inspire the next generation of wrestlers. By
                highlighting the pathways from high school to collegiate wrestling, we aim to motivate young athletes
                and provide them with examples of success stories from their own communities.
              </p>
              <h3>Our Goals</h3>
              <ul>
                <li>Track and celebrate every North Carolina wrestler's college commitment</li>
                <li>Provide comprehensive data and analytics about the state's wrestling ecosystem</li>
                <li>Connect the wrestling community through shared information and recognition</li>
                <li>Serve as a resource for athletes considering their collegiate options</li>
                <li>Highlight the strength and depth of North Carolina's wrestling programs</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Have questions, suggestions, or want to report a commitment? We'd love to hear from you!
              </p>
              <div className="space-y-2">
                <div>
                  <span className="block font-medium">Email</span>
                  <a href="mailto:info@ncwrestlingunited.com" className="text-sm text-blue-600 hover:underline">
                    info@ncwrestlingunited.com
                  </a>
                </div>
                <div>
                  <span className="block font-medium">Social Media</span>
                  <span className="text-sm">@NCUnitedWrestling</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8 bg-gradient-to-br from-[#13294B] to-[#1e3a5f] text-white">
            <CardHeader>
              <CardTitle className="text-white">501(c)(3) Nonprofit Organization</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-gray-100">
                NC Wrestling United is a registered 501(c)(3) nonprofit organization dedicated to supporting and promoting 
                wrestling in North Carolina. Our mission is to provide transparency in recruiting, celebrate athlete achievements, 
                and connect the wrestling community.
              </p>
              <p className="text-sm text-gray-200">
                All donations are tax-deductible to the extent allowed by law. We are committed to using resources 
                to serve athletes, families, and coaches across North Carolina.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Support the Portal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                The NC United Wrestling Portal is a labor of love created to support the wrestling community. If you'd
                like to help us maintain and improve this resource, consider supporting us.
              </p>
              <div className="space-y-2">
                <div>
                  <span className="block font-medium">Volunteer</span>
                  <span className="text-sm">Help us gather and verify information</span>
                </div>
                <div>
                  <span className="block font-medium">Spread the Word</span>
                  <span className="text-sm">Share our portal with your network</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-8 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Privacy & Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Public Information</h3>
                <p>
                  We display publicly available wrestling data including tournament results, rankings, and commitment information. 
                  All athlete photos are sourced from publicly available Instagram accounts.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Protected Information</h3>
                <p>
                  Academic information (GPA, SAT, ACT) and contact details (phone, email) are only visible to 
                  verified college coaches and administrators. This information is never shared publicly.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Your Rights</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Request profile edits or corrections anytime</li>
                  <li>Request profile removal by contacting us</li>
                  <li>Control whether coaches can see your contact info</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Data Sources</h3>
                <p>
                  Information comes from tournament results (NHSCA, Super 32, State Championships), 
                  user submissions, and publicly available sources. We do not sell or share your data with third parties.
                </p>
              </div>

              <div className="pt-4 border-t border-blue-200">
                <p className="text-xs text-gray-600">
                  <strong>Questions or concerns?</strong> Contact us at{" "}
                  <a href="mailto:info@ncwrestlingunited.com" className="text-blue-600 hover:underline">
                    info@ncwrestlingunited.com
                  </a>
                  {" "}or request profile removal anytime.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </AuthGuard>
  )
}
