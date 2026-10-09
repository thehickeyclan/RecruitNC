import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ContactForm } from "./contact-form"

export default function ContactPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">Contact Us</h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Send us a message</CardTitle>
            </CardHeader>
            <CardContent>
              <ContactForm />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium">Email</h3>
                <a
                  href="mailto:info@ncwrestlingunited.com"
                  className="text-sm text-muted-foreground hover:underline"
                >
                  info@ncwrestlingunited.com
                </a>
              </div>

              <div>
                <h3 className="font-medium">Social Media</h3>
                <p className="text-sm text-muted-foreground">
                  <a
                    href="https://www.instagram.com/ncwrestlingunited/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Instagram
                  </a>
                  {" · "}
                  <a
                    href="https://www.facebook.com/ncwrestlingunited"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Facebook
                  </a>
                </p>
              </div>

              <div>
                <h3 className="font-medium">Report a Commitment</h3>
                <p className="text-sm text-muted-foreground">
                  To report a new college commitment, please use the form or email us at{" "}
                  <a href="mailto:info@ncwrestlingunited.com" className="hover:underline">
                    info@ncwrestlingunited.com
                  </a>{" "}
                  with the athlete&apos;s information.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
