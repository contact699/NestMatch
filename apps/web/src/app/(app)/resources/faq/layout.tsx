import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ | NestMatch Resources',
  description: 'Find answers to frequently asked questions about renting, roommates, and tenant rights in Canada.',
  openGraph: {
    title: 'Frequently Asked Questions',
    description: 'Find answers to frequently asked questions about renting, roommates, and tenant rights.',
  },
}

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
