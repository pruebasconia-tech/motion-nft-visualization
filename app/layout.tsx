import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Motion NFT - Cellular Automata',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ height: '100%', width: '100%' }}>
      <body style={{ height: '100%', width: '100%', overflow: 'hidden', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  )
}
