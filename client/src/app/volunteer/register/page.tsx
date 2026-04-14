'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signUp } from '@/lib/supabase'

const countries = [
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

export default function VolunteerRegisterPage() {
  const [fullName, setFullName] = useState('')
  const [country, setCountry] = useState('Botswana')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please complete all required fields.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!agreeTerms) {
      setError('You must agree to the terms and conditions.')
      return
    }

    setLoading(true)

    try {
      const { error: signUpError } = await signUp(email, password, {
        full_name: fullName,
        country,
        account_type: 'volunteer',
      })

      if (signUpError) throw signUpError

      setSuccess(true)
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-ivory py-16 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-earth mb-3">Account Created</h1>
          <p className="text-gray-700 mb-6">Please check your email to verify your account before signing in.</p>
          <Link href="/" className="btn btn-primary">Back to Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ivory py-10 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-earth mb-2">Volunteer Registration</h1>
        <p className="text-gray-600 mb-6">Create your volunteer account to apply across Botswana and Southern Africa.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input className="form-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <select className="form-input" value={country} onChange={(e) => setCountry(e.target.value)}>
              {countries.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create password" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input className="form-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" />
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" className="mt-1" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
            <span>I agree to Bokopano terms and conditions.</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Volunteer Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
