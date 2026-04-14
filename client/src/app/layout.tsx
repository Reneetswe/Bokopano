import './tailwind.generated.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bokopano - Work. Grow. Belong.',
  description: 'Volunteer and work-exchange platform in Africa. Trade skills for accommodation, food, and unforgettable experiences.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
