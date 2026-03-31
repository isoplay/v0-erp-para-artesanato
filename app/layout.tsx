import type { Metadata, Viewport } from 'next'
import { Poppins } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { ServiceWorkerRegistration } from '@/components/service-worker-registration'
import './globals.css'

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins'
})

export const metadata: Metadata = {
  title: 'Exclusiv Art - Gestao de Artesanato',
  description: 'Sistema de gestao para artesanato religioso - tercos, pulseiras e chaveiros',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Exclusiv Art',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
}

export const viewport: Viewport = {
  themeColor: '#C8BDE9',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="apple-touch-icon" href="/logo.jpg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${poppins.variable} font-sans antialiased`}>
        {children}
        <Toaster position="top-right" richColors />
        <ServiceWorkerRegistration />
        <Analytics />
      </body>
    </html>
  )
}
