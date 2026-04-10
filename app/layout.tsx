import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'かぞくアプリ',
  description: '豪・美緒・京弥の家族共有アプリ',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'かぞくアプリ',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body
        className="bg-gray-50"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif" }}
      >
        {children}
      </body>
    </html>
  )
}
