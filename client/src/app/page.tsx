'use client'

import { useEffect } from 'react'

export default function HomePage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.href = 'http://localhost:8080'
    }
  }, [])

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center">
      <p className="text-gray-600">Redirecting to Bokopano...</p>
    </div>
  )
}
