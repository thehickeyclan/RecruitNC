import Link from "next/link"
import Image from "next/image"

export function Footer() {
  return (
    <footer className="border-t bg-nc-blue text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <Link href="https://www.ncwrestlingunited.com" className="flex items-center">
              <Image
                src="/nc-united-main-logo.png"
                alt="NC United Wrestling"
                width={60}
                height={60}
                className="mr-3"
                priority
              />
              <h3 className="text-lg font-semibold">NC United Wrestling</h3>
            </Link>
            <p className="mt-2 text-sm text-gray-300">
              Tracking North Carolina's wrestling talent and college commitments.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Quick Links</h3>
            <ul className="mt-2 space-y-2">
              <li>
                <Link href="/athletes" className="text-sm text-gray-300 hover:text-white">
                  Athletes
                </Link>
              </li>
              <li>
                <Link href="/colleges" className="text-sm text-gray-300 hover:text-white">
                  Colleges
                </Link>
              </li>
              <li>
                <Link href="/stats" className="text-sm text-gray-300 hover:text-white">
                  Statistics
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-gray-300 hover:text-white">
                  About
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Contact</h3>
            <p className="mt-2 text-sm text-gray-300">Have questions or want to report a commitment?</p>
            <Link href="/contact" className="mt-2 inline-block text-sm font-medium text-blue-400 hover:text-blue-300">
              Contact Us
            </Link>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-700 pt-8">
          <p className="text-center text-sm text-gray-300">
            &copy; {new Date().getFullYear()} NC United Wrestling. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
