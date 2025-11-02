import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AboutPage() {
  return (
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
                  <span className="text-sm">info@ncunitedwrestling.com</span>
                </div>
                <div>
                  <span className="block font-medium">Social Media</span>
                  <span className="text-sm">@NCUnitedWrestling</span>
                </div>
              </div>
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
        </div>
      </div>
    </div>
  )
}
