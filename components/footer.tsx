import Image from "next/image"
import { HardLink } from "@/components/hard-link"
import { StoreButton } from "@/components/store-button"

export function Footer() {
  return (
    <footer className="border-t bg-[#003366] text-white">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8 md:py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 md:gap-8">
          <div>
            <a href="/" className="flex items-center">
              <Image
                src="/images/nc-united-logo-white.png"
                alt="NC United Wrestling"
                width={120}
                height={44}
                className="h-8 w-auto mr-2 mix-blend-screen sm:h-10 sm:mr-3"
                priority
              />
              <h3 className="text-sm font-semibold sm:text-lg">NC United Wrestling</h3>
            </a>
            <p className="mt-1 text-xs text-gray-300 sm:mt-2 sm:text-sm">
              Tracking North Carolina's wrestling talent and college commitments.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold sm:text-lg">Quick Links</h3>
            <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:mt-2 sm:grid-cols-1 sm:space-y-2 sm:gap-0">
              <li>
                <a href="/prospects/all" className="text-xs text-gray-300 hover:text-white sm:text-sm">
                  Athlete Profiles
                </a>
              </li>
              <li>
                <a href="/public-rankings" className="text-xs text-gray-300 hover:text-white sm:text-sm">
                  Rankings
                </a>
              </li>
              <li>
                <HardLink href="/calendar" className="text-xs text-gray-300 hover:text-white sm:text-sm">
                  Calendar
                </HardLink>
              </li>
              <li>
                <a href="/blue" className="text-xs text-gray-300 hover:text-white sm:text-sm">
                  Blue Program
                </a>
              </li>
              <li>
                <HardLink href="/fundraising" className="text-xs text-gray-300 hover:text-white sm:text-sm">
                  Fundraising
                </HardLink>
              </li>
              <li>
                <a href="/national-team" className="text-xs text-gray-300 hover:text-white sm:text-sm">
                  National Team
                </a>
              </li>
              <li>
                <a href="/athletes" className="text-xs text-gray-300 hover:text-white sm:text-sm">
                  Commitments
                </a>
              </li>
              <li>
                <a href="/high-schools" className="text-xs text-gray-300 hover:text-white sm:text-sm">
                  By High School
                </a>
              </li>
              <li>
                <a href="/colleges" className="text-xs text-gray-300 hover:text-white sm:text-sm">
                  By College
                </a>
              </li>
              <li>
                <a href="/stats" className="text-xs text-gray-300 hover:text-white sm:text-sm">
                  Statistics
                </a>
              </li>
              <li>
                <StoreButton className="text-xs text-gray-300 hover:text-white cursor-pointer border-0 bg-transparent font-inherit p-0 sm:text-sm">Store</StoreButton>
              </li>
              <li>
                <a
                  href="https://legacy.ncwrestlingunited.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-300 hover:text-white sm:text-sm"
                >
                  LegacyNC
                </a>
              </li>
              <li>
                <a
                  href="https://ncwrestlingunited.com/about/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-300 hover:text-white sm:text-sm"
                >
                  About
                </a>
              </li>
              <li>
                <a href="/contact" className="text-xs text-gray-300 hover:text-white sm:text-sm">
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold sm:text-lg">Contact</h3>
            <p className="mt-1 text-xs text-gray-300 sm:mt-2 sm:text-sm">Have questions or want to report a commitment?</p>
            <a
              href="mailto:info@ncwrestlingunited.com"
              className="mt-1 inline-block text-xs font-medium text-white/90 hover:text-white sm:mt-2 sm:text-sm"
            >
              info@ncwrestlingunited.com
            </a>
            <span className="mx-1 text-gray-500 sm:mx-2">·</span>
            <a href="/contact" className="text-xs font-medium text-white/90 hover:text-white sm:text-sm">
              Contact Us
            </a>
            <p className="mt-2 text-xs text-gray-300 sm:mt-3 sm:text-sm">Follow us</p>
            <div className="mt-0.5 flex gap-2 sm:mt-1 sm:gap-3">
              <a
                href="https://www.instagram.com/ncwrestlingunited/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-white/90 hover:text-white sm:text-sm"
              >
                Instagram
              </a>
              <a
                href="https://www.facebook.com/ncwrestlingunited"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-white/90 hover:text-white sm:text-sm"
              >
                Facebook
              </a>
            </div>
          </div>
        </div>
        <div className="mt-4 border-t border-gray-700 pt-4 sm:mt-6 sm:pt-6 md:mt-8 md:pt-8">
          <p className="text-center text-xs text-gray-300 sm:text-sm">
            &copy; {new Date().getFullYear()} NC United Wrestling. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
