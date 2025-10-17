import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gifty - VIP Goodie Bag Management',
  description: 'Elegant goodie bag verification for exclusive events',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
