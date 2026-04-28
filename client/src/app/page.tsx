'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to opportunities page
    router.replace('/opportunities')
  }, [router])

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center">
      <p className="text-gray-600">Loading...</p>
    </div>
  )
}
