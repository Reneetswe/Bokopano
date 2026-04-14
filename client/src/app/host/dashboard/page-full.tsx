'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getHostByUserId, getHostOpportunities } from '@/lib/supabase'
import { getStatusColor, getStatusText } from '@/lib/utils'
import Link from 'next/link'

export default function HostDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [hostData, setHostData] = useState<any>(null)
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin?redirect=/host/dashboard')
      return
    }

    if (user) {
      fetchHostData()
    }
  }, [user, loading, router])

  const fetchHostData = async () => {
    try {
      const { data: host } = await getHostByUserId(user!.id)
      if (!host) {
        router.push('/host/apply')
        return
      }

      setHostData(host)

      if (host.status === 'APPROVED') {
        const { data: opps } = await getHostOpportunities(host.id)
        setOpportunities(opps || [])
      }
    } catch (error) {
      console.error('Error fetching host data:', error)
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

  if (!user || !hostData) {
    return null // Will redirect
  }

  const isApproved = hostData.status === 'APPROVED'
  const completionPercentage = hostData.completion_percentage || 0

  return (
    <div className="min-h-screen bg-ivory py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-earth mb-2">Host Dashboard</h1>
          <p className="text-gray-600">Manage your host profile and opportunities</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-earth mb-2">
                {hostData.host_profiles?.organization_name || 'Your Organization'}
              </h2>
              <div className="flex items-center space-x-4">
                <span className={`status-badge ${getStatusColor(hostData.status)}`}>
                  {getStatusText(hostData.status)}
                </span>
                <span className="text-sm text-gray-500">
                  Applied {new Date(hostData.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            {hostData.status === 'DRAFT' && (
              <Link href="/host/apply" className="btn btn-primary">
                Complete Application
              </Link>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Profile Completion</span>
              <span className="text-gray-600">{completionPercentage}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Status Messages */}
          {hostData.status === 'SUBMITTED' && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Application Under Review</h3>
              <p className="text-blue-700">
                Your application has been submitted and is currently being reviewed by our team. 
                This process typically takes 3-5 business days. We'll notify you once a decision has been made.
              </p>
            </div>
          )}

          {hostData.status === 'NEEDS_INFO' && (
            <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h3 className="font-semibold text-orange-800 mb-2">Additional Information Needed</h3>
              <p className="text-orange-700 mb-3">
                We need some additional information to process your application.
              </p>
              {hostData.admin_notes && (
                <div className="bg-white p-3 rounded border border-orange-300">
                  <p className="text-sm text-orange-800">
                    <strong>Review Notes:</strong> {hostData.admin_notes}
                  </p>
                </div>
              )}
              <Link href="/host/apply" className="btn btn-primary mt-3">
                Update Application
              </Link>
            </div>
          )}

          {hostData.status === 'REJECTED' && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">Application Not Approved</h3>
              <p className="text-red-700 mb-3">
                Unfortunately, we cannot approve your application at this time.
              </p>
              {hostData.rejection_reason && (
                <div className="bg-white p-3 rounded border border-red-300">
                  <p className="text-sm text-red-800">
                    <strong>Reason:</strong> {hostData.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          )}

          {hostData.status === 'SUSPENDED' && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">Account Suspended</h3>
              <p className="text-red-700">
                Your host account has been temporarily suspended. Please contact support for more information.
              </p>
            </div>
          )}
        </div>

        {/* Approved Host Content */}
        {isApproved && (
          <>
            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-clay/10 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-clay" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h3 className="font-semibold">Create Opportunity</h3>
                </div>
                <p className="text-gray-600 mb-4">List a new volunteer opportunity</p>
                <Link href="/host/opportunities/new" className="btn btn-primary w-full">
                  Create New
                </Link>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-leaf/10 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-leaf" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold">View Applications</h3>
                </div>
                <p className="text-gray-600 mb-4">Review volunteer applications</p>
                <Link href="/host/applications" className="btn btn-outline w-full">
                  View All
                </Link>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-savanna/10 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-earth" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold">Edit Profile</h3>
                </div>
                <p className="text-gray-600 mb-4">Update your host information</p>
                <Link href="/host/profile/edit" className="btn btn-outline w-full">
                  Edit Profile
                </Link>
              </div>
            </div>

            {/* Opportunities List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-earth">My Opportunities</h2>
                <Link href="/host/opportunities/new" className="btn btn-primary">
                  Create New
                </Link>
              </div>

              {opportunities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No opportunities yet</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first volunteer opportunity to start receiving applications.
                  </p>
                  <Link href="/host/opportunities/new" className="btn btn-primary">
                    Create Opportunity
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {opportunities.map((opportunity) => (
                    <div key={opportunity.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-earth mb-2">{opportunity.title}</h3>
                          <p className="text-gray-600 mb-2 line-clamp-2">{opportunity.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{opportunity.duration_weeks} weeks</span>
                            <span>{opportunity.number_of_volunteers} volunteers</span>
                            <span className={`status-badge ${opportunity.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {opportunity.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Link 
                            href={`/host/opportunities/${opportunity.id}/edit`}
                            className="btn btn-outline btn-sm"
                          >
                            Edit
                          </Link>
                          <Link 
                            href={`/host/opportunities/${opportunity.id}/applications`}
                            className="btn btn-outline btn-sm"
                          >
                            Applications
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Non-Approved Host Warning */}
        {!isApproved && hostData.status !== 'DRAFT' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-yellow-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="font-semibold text-yellow-800 mb-2">Account Under Review</h3>
                <p className="text-yellow-700">
                  Your account is currently under review. You cannot publish opportunities until your application is approved. 
                  Please wait for our team to review your application, or contact support if you have any questions.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
