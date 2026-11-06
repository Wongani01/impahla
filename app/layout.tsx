import type { Metadata, Viewport } from 'next'
import { OfflineSetup } from '@/components/offline-setup'
import './globals.css'

export const metadata: Metadata = {
  title: 'Impahla app · Party Registry',
  description: 'A private, offline-first contribution registry for kitchen parties and bridal showers in Zambia.',
  applicationName: 'Impahla app',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/registry-mark.svg',
    apple: '/registry-mark.svg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#3c2636',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <OfflineSetup />
        {children}
      </body>
    </html>
  )
}
