'use client'

import { MapPin, BedDouble, Bath } from 'lucide-react'

const LISTINGS = [
  {
    title: 'Modern Loft @ Liberty Village',
    location: 'Toronto, Canada',
    price: '$1,850/mo',
    beds: 2,
    baths: 2,
  },
  {
    title: 'Skyline View Condo',
    location: 'Vancouver, Canada',
    price: '$2,100/mo',
    beds: 1,
    baths: 1,
  },
]

export function VerifiedListingsSection() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16 max-w-2xl" data-animate>
          <h2 className="font-display text-4xl font-bold text-primary mb-6">
            Top Verified Listings
          </h2>
          <p className="text-lg text-on-surface-variant leading-relaxed">
            Curated condos and shared units in Canada&apos;s most vibrant
            neighborhoods. Secure, pre-vetted, and ready for move-in.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {LISTINGS.map((listing, index) => (
            <div
              key={listing.title}
              className="group cursor-pointer"
              data-animate
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="aspect-[16/10] rounded-3xl overflow-hidden mb-6 relative bg-surface-container">
                <div className="w-full h-full bg-gradient-to-br from-surface-container-low via-surface-container to-surface-container-high group-hover:scale-110 transition-transform duration-700 flex items-center justify-center">
                  <div className="text-center">
                    <BedDouble className="h-12 w-12 text-on-surface-variant/20 mx-auto mb-2" />
                    <p className="text-on-surface-variant/30 text-sm font-medium">
                      Listing Preview
                    </p>
                  </div>
                </div>
                <div className="absolute bottom-6 left-6 bg-surface-container-lowest/90 backdrop-blur px-4 py-2 rounded-xl text-primary font-bold shadow-lg">
                  {listing.price}
                </div>
              </div>

              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-display text-2xl font-bold text-primary mb-1">
                    {listing.title}
                  </h3>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{listing.location}</span>
                  </div>
                </div>
                <div className="flex gap-4 text-on-surface-variant">
                  <div className="flex items-center gap-1">
                    <BedDouble className="h-5 w-5" />
                    <span className="text-sm font-semibold">
                      {listing.beds}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bath className="h-5 w-5" />
                    <span className="text-sm font-semibold">
                      {listing.baths}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
