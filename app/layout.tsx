import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Builder Pulse',
  description: 'What developers and builders are paying attention to right now.',
  openGraph: {
    title: 'Builder Pulse',
    description: 'What developers and builders are paying attention to right now.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-[var(--font-inter)] bg-[#fafafa] text-[#111111] min-h-screen">
        <header className="border-b border-[#e5e7eb] bg-white">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span className="text-sm font-semibold tracking-tight text-[#111111]">
                Builder Pulse
              </span>
            </a>
            <span className="text-xs text-[#6b7280] hidden sm:block">
              What developers are paying attention to right now
            </span>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-[#e5e7eb] mt-24">
          <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
            <span className="text-xs text-[#6b7280]">Builder Pulse</span>
            <span className="text-xs text-[#6b7280]">
              Signals from GitHub · Hacker News · Reddit
            </span>
          </div>
        </footer>
      </body>
    </html>
  )
}
