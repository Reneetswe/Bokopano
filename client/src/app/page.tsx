'use client'

import { useEffect } from 'react'

export default function HomePage() {

  useEffect(() => {
    // Redirect to landing page
    window.location.href = '/home.html'
  }, [])

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center">
      <p className="text-gray-600">Loading...</p>
    </div>
  )
}
