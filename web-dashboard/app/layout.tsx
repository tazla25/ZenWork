import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'], 
  variable: '--font-space-grotesk',
  weight: ['600', '700']
})

export const metadata: Metadata = {
  title: 'ZenWork — Focus and Trust',
  description: 'Your personal productivity companion. Track focus, understand patterns, improve daily. Not a spy tool.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased bg-[#0a0a1a] min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
