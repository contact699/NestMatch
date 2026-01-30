'use client'

import { Home, Heart } from 'lucide-react'

const FOOTER_LINKS = [
  {
    title: 'Product',
    links: ['Search Listings', 'How It Works', 'Pricing', 'FAQ'],
  },
  {
    title: 'Company',
    links: ['About', 'Blog', 'Careers', 'Contact'],
  },
  {
    title: 'Legal',
    links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
  },
]

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Home className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">NestMatch</span>
            </div>
            <p className="text-gray-500 mb-6 max-w-xs">
              Canada&apos;s trust-first roommate platform. Find verified
              roommates who match your lifestyle.
            </p>
            <div className="flex gap-4">
              {['twitter', 'instagram', 'linkedin'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <span className="sr-only">{social}</span>
                  <div className="w-5 h-5 rounded bg-gray-600" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {FOOTER_LINKS.map((section) => (
            <div key={section.title}>
              <h4 className="text-white font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="hover:text-white transition-colors link-underline"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} NestMatch. All rights reserved.
          </p>
          <p className="text-sm flex items-center gap-2">
            Made with <Heart className="h-4 w-4 text-red-500 fill-red-500" />{' '}
            in Ottawa, Canada
          </p>
        </div>
      </div>
    </footer>
  )
}
