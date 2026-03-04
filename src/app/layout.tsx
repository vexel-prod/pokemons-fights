import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '../App.css'

export const metadata: Metadata = {
  title: 'POKE-FIGHT!',
  description: 'Pokemon fights arena',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  )
}
