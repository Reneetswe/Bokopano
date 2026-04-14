'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getHostByUserId } from '@/lib/supabase'
import { HostApplicationForm } from '@/components/host/HostApplicationForm'

export default function HostApplyPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [existingHost, setExistingHost] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin?redirect=/host/apply')
      return
    }

    if (user) {
      checkExistingHost()
    }
  }, [user, loading, router])

  const checkExistingHost = async () => {
    try {
      const { data } = await getHostByUserId(user!.id)
      if (data) {
        setExistingHost(data)
        // If host already exists, redirect to dashboard
        if (data.status !== 'DRAFT') {
          router.push('/host/dashboard')
        }
      }
    } catch (error) {
      console.error('Error checking existing host:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clay"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-ivory py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-earth mb-4">
            Become a Host
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join our community of trusted hosts and share your opportunities with passionate volunteers from around the world.
          </p>
        </div>

        <HostApplicationForm 
          userId={user.id} 
          existingHost={existingHost}
          onComplete={() => router.push('/host/dashboard')}
        />
      </div>
    </div>
  )
}
