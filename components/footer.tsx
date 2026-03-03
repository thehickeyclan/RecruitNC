import Link from "next/link"
import Image from "next/image"
import { StoreButton } from "@/components/store-button"

export function Footer() {
  return (
    <footer className="border-t bg-[#003366] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <Link href="/" className="flex items-center">
              <Image
                src="/images/nc-united-logo-white.png"
                alt="NC United Wrestling"
                width={120}
                height={44}
                className="h-10 w-auto mr-3 mix-blend-screen"
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
                <Link href="/prospects/all" className="text-sm text-gray-300 hover:text-white">
                  Athlete Profiles
                </Link>
              </li>
              <li>
                <Link href="/public-rankings" className="text-sm text-gray-300 hover:text-white">
                  Rankings
                </Link>
              </li>
              <li>
                <Link href="/blue" className="text-sm text-gray-300 hover:text-white">
                  Blue Program
                </Link>
              </li>
              <li>
                <Link href="/national-team" className="text-sm text-gray-300 hover:text-white">
                  National Team
                </Link>
              </li>
              <li>
                <Link href="/athletes" className="text-sm text-gray-300 hover:text-white">
                  Commitments
                </Link>
              </li>
              <li>
                <Link href="/high-schools" className="text-sm text-gray-300 hover:text-white">
                  By High School
                </Link>
              </li>
              <li>
                <Link href="/colleges" className="text-sm text-gray-300 hover:text-white">
                  By College
                </Link>
              </li>
              <li>
                <Link href="/stats" className="text-sm text-gray-300 hover:text-white">
                  Statistics
                </Link>
              </li>
              <li>
                <StoreButton className="text-sm text-gray-300 hover:text-white cursor-pointer border-0 bg-transparent font-inherit p-0">Store</StoreButton>
              </li>
              <li>
                <a
                  href="https://legacy.ncwrestlingunited.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-300 hover:text-white"
                >
                  LegacyNC
                </a>
              </li>
              <li>
                <a
                  href="https://ncwrestlingunited.com/about/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-300 hover:text-white"
                >
                  About
                </a>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-300 hover:text-white">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Contact</h3>
            <p className="mt-2 text-sm text-gray-300">Have questions or want to report a commitment?</p>
            <a
              href="mailto:info@ncwrestlingunited.com"
              className="mt-2 inline-block text-sm font-medium text-white/90 hover:text-white"
            >
              info@ncwrestlingunited.com
            </a>
            <span className="mx-2 text-gray-500">·</span>
            <Link href="/contact" className="text-sm font-medium text-white/90 hover:text-white">
              Contact Us
            </Link>
            <p className="mt-3 text-sm text-gray-300">Follow us</p>
            <div className="mt-1 flex gap-3">
              <a
                href="https://www.instagram.com/ncwrestlingunited/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-white/90 hover:text-white"
              >
                Instagram
              </a>
              <a
                href="https://www.facebook.com/ncwrestlingunited"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-white/90 hover:text-white"
              >
                Facebook
              </a>
            </div>
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
