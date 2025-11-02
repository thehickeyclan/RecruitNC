"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthNav } from "@/components/auth-nav"

export default function DemoNavClient() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Auth Navigation Demo</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Navigation with Authentication</CardTitle>
          <CardDescription>Example of how the authentication navigation would look in your portal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-md bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="font-medium">NC United Wrestling</div>
              <AuthNav />
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm text-muted-foreground">
              This demonstrates how the authentication navigation would appear in your portal. When a user is signed in,
              it shows a profile link. When not signed in, it shows sign in and sign up buttons.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Integration Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">To integrate this authentication system into your existing portal:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Add the AuthProviderNew to your layout.tsx file</li>
              <li>Add the AuthNav component to your portal navigation</li>
              <li>Use the ProtectedRoute component for pages that require authentication</li>
              <li>Create database tables for user-specific features like likes</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo Pages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">Check out these demo pages to see the authentication system in action:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>
                <a href="/auth/signin" className="text-blue-600 hover:underline">
                  Sign In Page
                </a>
              </li>
              <li>
                <a href="/auth/signup" className="text-blue-600 hover:underline">
                  Sign Up Page
                </a>
              </li>
              <li>
                <a href="/auth/profile" className="text-blue-600 hover:underline">
                  User Profile (Protected)
                </a>
              </li>
              <li>
                <a href="/auth/demo-likes" className="text-blue-600 hover:underline">
                  Commitment Likes Demo
                </a>
              </li>
              <li>
                <a href="/auth/demo-rankings" className="text-blue-600 hover:underline">
                  Protected Rankings Demo
                </a>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
