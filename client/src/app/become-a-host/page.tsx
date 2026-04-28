'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HostApplicationForm } from '@/components/host/HostApplicationForm'
import { getCurrentUser, getHostByUserId, signIn, signUp, supabase } from '@/lib/supabase'

const southernAfricanCountries = [
  'Botswana',
  'South Africa',
  'Namibia',
  'Zimbabwe',
  'Zambia',
  'Mozambique',
  'Lesotho',
  'Eswatini',
  'Malawi',
  'Angola',
  'Other',
]

export default function BecomeHostPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [existingHost, setExistingHost] = useState<any>(null)
  const [success, setSuccess] = useState(false)
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [authError, setAuthError] = useState('')

  const [fullName, setFullName] = useState('')
  const [country, setCountry] = useState('Botswana')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)

  useEffect(() => {
    const initialize = async () => {
      if (typeof window !== 'undefined') {
        const prefillRaw = localStorage.getItem('bokopano_host_prefill')
        if (prefillRaw) {
          try {
            const prefill = JSON.parse(prefillRaw)
            if (prefill.fullName) setFullName(prefill.fullName)
            if (prefill.country) setCountry(prefill.country)
            if (prefill.email) {
              setEmail(prefill.email)
              setMode('signin')
            }
          } catch {
            localStorage.removeItem('bokopano_host_prefill')
          }
        }
      }

      let { user } = await getCurrentUser()

      if (!user && typeof window !== 'undefined') {
        const sessionRaw = localStorage.getItem('bokopano_supabase_session')

        if (sessionRaw) {
          try {
            const session = JSON.parse(sessionRaw)
            if (session?.access_token && session?.refresh_token) {
              const { error } = await supabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              })

              if (!error) {
                const current = await getCurrentUser()
                user = current.user
              }
            }
          } catch {
            localStorage.removeItem('bokopano_supabase_session')
          }
        }
      }

      if (user) {
        setUserId(user.id)
        const { data } = await getHostByUserId(user.id)
        if (data) {
          // If already submitted/approved/under review, redirect to dashboard
          if (['APPROVED', 'SUBMITTED', 'UNDER_REVIEW'].includes(data.status)) {
            router.push('/host/dashboard')
            return
          }
          setExistingHost(data)
        }
      }

      setLoading(false)
    }

    initialize()
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')

    if (!email || !password) {
      setAuthError('Email and password are required.')
      return
    }

    if (mode === 'signup') {
      if (!fullName) {
        setAuthError('Full name is required.')
        return
      }

      if (password !== confirmPassword) {
        setAuthError('Passwords do not match.')
        return
      }

      if (!agreeTerms) {
        setAuthError('You must agree to the terms and conditions.')
        return
      }
    }

    setAuthLoading(true)

    try {
      if (mode === 'signup') {
        const { data, error } = await signUp(email, password, {
          full_name: fullName,
          country,
          account_type: 'host',
        })

        if (error) throw error

        const newUserId = data.user?.id
        const hasSession = !!data.session

        if (!newUserId) {
          setAuthError('Unable to create account. Please try again.')
          return
        }

        if (!hasSession) {
          setAuthError('Account created. Please confirm your email, then sign in to continue your host application.')
          setMode('signin')
          return
        }

        setUserId(newUserId)
      } else {
        const { data, error } = await signIn(email, password)
        if (error) throw error

        const signedInUserId = data.user?.id
        if (!signedInUserId) {
          setAuthError('Sign in failed. Please try again.')
          return
        }

        setUserId(signedInUserId)

        const { data: host } = await getHostByUserId(signedInUserId)
        if (host) {
          // If already submitted/approved/under review, redirect to dashboard
          if (['APPROVED', 'SUBMITTED', 'UNDER_REVIEW'].includes(host.status)) {
            router.push('/host/dashboard')
            return
          }
          setExistingHost(host)
        }
      }
    } catch (error: any) {
      setAuthError(error?.message || 'Authentication failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory px-4">
        <div className="text-center" aria-live="polite" aria-busy="true">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-clay mx-auto" />
          <span className="sr-only">Loading</span>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-ivory py-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8 sm:p-10 text-center border border-[#efe7d8]">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-earth mb-4">Application Approved!</h1>
          <p className="text-lg text-gray-700 mb-6">Your host account is now active.</p>
          <p className="text-gray-600 mb-8">
            You can now access your Host Dashboard to post opportunities, manage applicants, track bookings, and more.
          </p>
          <Link href="/host/dashboard" className="btn btn-primary btn-large">Go to Host Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ivory py-8 sm:py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/70 border border-[#efe7d8] rounded-2xl p-5 sm:p-7 mb-6 sm:mb-8">
          <div className="flex flex-col gap-3 sm:gap-4">
            <Link href="/" className="text-sm text-clay hover:text-clay-dark font-medium w-fit">
              ← Back to Bokopano Home
            </Link>
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-earth mb-2">Become a Host</h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Complete this secure multi-step application to join Bokopano as a verified host.
              </p>
            </div>
          </div>
        </div>

        {!userId ? (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-[#efe7d8]">
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-clay text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-clay text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="form-input" placeholder="Your full name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <select value={country} onChange={(e) => setCountry(e.target.value)} className="form-input">
                      {southernAfricanCountries.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" type="email" placeholder="you@example.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" type="password" placeholder="Create a strong password" />
              </div>

              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="form-input" type="password" placeholder="Re-enter password" />
                  </div>
                  <label className="flex items-start gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-1" />
                    <span>I agree to Bokopano terms and conditions and privacy policy.</span>
                  </label>
                </>
              )}

              {authError && <p className="text-sm text-red-600">{authError}</p>}

              <button type="submit" className="btn btn-primary w-full" disabled={authLoading}>
                {authLoading ? 'Please wait...' : mode === 'signup' ? 'Create Account & Continue' : 'Sign In & Continue'}
              </button>
            </form>
          </div>
        ) : (
          <HostApplicationForm
            userId={userId}
            existingHost={existingHost}
            onComplete={() => setSuccess(true)}
          />
        )}
      </div>
    </div>
  )
}
