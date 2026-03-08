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
      <body className='relative min-h-dvh'>
        <video
          className='pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover'
          autoPlay
          loop
          muted
          playsInline
          preload='auto'
        >
          <source src='/bg-loop.mp4' type='video/mp4' />
        </video>
        <div className='pointer-events-none fixed inset-0 -z-10 bg-black/40' />
        {children}
      </body>
    </html>
  )
}
