'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  getCurrentUser,
  getHostByUserId,
  getHostOpportunities,
  updateHostOpportunity,
  deleteHostOpportunity,
  signOut,
  supabase,
} from '@/lib/supabase'

type Tab = 'overview' | 'opportunities' | 'applicants' | 'bookings' | 'earnings' | 'reviews' | 'availability' | 'settings'

const NAV_ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'opportunities', label: 'Opportunities', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { id: 'applicants', label: 'Applicants', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { id: 'bookings', label: 'Bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'earnings', label: 'Earnings', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'reviews', label: 'Reviews', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { id: 'availability', label: 'Availability', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
]

const CATEGORY_LABELS: Record<string, string> = {
  CONSERVATION: 'Conservation',
  EDUCATION: 'Education',
  COMMUNITY: 'Community',
  AGRICULTURE: 'Agriculture',
  HEALTHCARE: 'Healthcare',
  ARTS_CULTURE: 'Arts & Culture',
  TECHNOLOGY: 'Technology',
  TOURISM: 'Tourism',
  CONSTRUCTION: 'Construction',
  SOCIAL_WORK: 'Social Work',
}

export default function HostDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [host, setHost] = useState<any>(null)
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>('overview')
  const [mobileNav, setMobileNav] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const init = async () => {
      // First try to get session (handles both Next.js and CDN Supabase sign-ins)
      const { data: { session } } = await supabase.auth.getSession()
      let user = session?.user || null

      if (!user) {
        // Try getUser as fallback
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        user = currentUser
      }

      if (!user) { router.push('/become-a-host'); return }

      setUserName(user.user_metadata?.full_name || user.email || '')

      const { data: hostData } = await getHostByUserId(user.id)
      if (!hostData) { router.push('/become-a-host'); return }

      // Submitted and approved hosts see the full dashboard
      if (hostData.status !== 'APPROVED' && hostData.status !== 'SUBMITTED') {
        setHost(hostData)
        setLoading(false)
        return
      }

      setHost(hostData)

      const { data: opps } = await getHostOpportunities(hostData.id)
      setOpportunities(opps || [])

      setLoading(false)
    }
    init()
  }, [router])

  const refreshOpportunities = async () => {
    if (!host?.id) return
    const { data } = await getHostOpportunities(host.id)
    setOpportunities(data || [])
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F0]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-clay mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // ── Not Approved Gate ──
  if (host && host.status !== 'APPROVED' && host.status !== 'SUBMITTED') {
    const statusConfig: Record<string, { bg: string; border: string; text: string; title: string; desc: string }> = {
      DRAFT: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', title: 'Application In Progress', desc: 'Complete your host application to get started.' },
      SUBMITTED: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', title: 'Under Review', desc: 'Your application is being reviewed. We\'ll notify you once a decision is made.' },
      REJECTED: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', title: 'Application Not Approved', desc: 'Unfortunately your application was not approved. Please contact support for more information.' },
    }
    const cfg = statusConfig[host.status] || statusConfig.DRAFT

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F0] px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 border border-gray-100 text-center">
          <div className={`w-16 h-16 rounded-full ${cfg.bg} ${cfg.border} border-2 flex items-center justify-center mx-auto mb-4`}>
            <svg className={`w-8 h-8 ${cfg.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{cfg.title}</h1>
          <p className={`text-sm ${cfg.text} mb-6`}>{cfg.desc}</p>
          <div className="flex gap-3 justify-center">
            {host.status === 'DRAFT' && (
              <Link href="/become-a-host" className="px-5 py-2.5 bg-clay text-white text-sm font-semibold rounded-lg hover:bg-clay/90 transition-colors">
                Continue Application
              </Link>
            )}
            <Link href="/" className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const orgName = host?.host_profiles?.organization_name || 'My Organization'
  const activeOpps = opportunities.filter(o => o.status === 'active').length
  const totalVolunteers = opportunities.reduce((sum: number, o: any) => sum + (o.number_of_volunteers || 0), 0)

  // ── Dashboard Layout ──
  return (
    <div className="min-h-screen bg-[#FAF7F0]">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-bold text-earth italic">Bokopano</Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500 hidden sm:block">Host Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">{userName}</span>
            <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto flex">
        {/* ── Sidebar ── */}
        <aside className="hidden lg:flex flex-col w-56 min-h-[calc(100vh-56px)] bg-white border-r border-gray-200 p-4 sticky top-14 self-start">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Organization</p>
            <p className="text-sm font-semibold text-gray-800 truncate">{orgName}</p>
            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 rounded-full">Approved</span>
          </div>
          <nav className="space-y-0.5 flex-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  tab === item.id ? 'bg-clay/10 text-clay' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile nav toggle */}
        <div className="lg:hidden fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setMobileNav(!mobileNav)}
            className="w-12 h-12 bg-clay text-white rounded-full shadow-lg flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile nav overlay */}
        {mobileNav && (
          <div className="lg:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setMobileNav(false)}>
            <div className="absolute left-0 top-0 bottom-0 w-64 bg-white p-4 shadow-xl" onClick={e => e.stopPropagation()}>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Organization</p>
              <p className="text-sm font-semibold text-gray-800 mb-4">{orgName}</p>
              <nav className="space-y-0.5">
                {NAV_ITEMS.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setTab(item.id); setMobileNav(false) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      tab === item.id ? 'bg-clay/10 text-clay' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* ── Main Content ── */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back!</h1>
              <p className="text-sm text-gray-500 mb-6">Here&apos;s what&apos;s happening with your listings.</p>

              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Active Listings', value: activeOpps, color: 'text-clay', bg: 'bg-clay/10' },
                  { label: 'Total Opportunities', value: opportunities.length, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Volunteer Spots', value: totalVolunteers, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Applications', value: 0, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <h2 className="text-sm font-bold text-gray-800 mb-3">Quick Actions</h2>
              <div className="grid sm:grid-cols-3 gap-3 mb-8">
                <button onClick={() => setTab('opportunities')} className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-clay/30 hover:shadow-sm transition-all">
                  <div className="w-9 h-9 rounded-lg bg-clay/10 flex items-center justify-center mb-2">
                    <svg className="w-4 h-4 text-clay" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">Post Opportunity</p>
                  <p className="text-xs text-gray-400">Create a new listing</p>
                </button>
                <button onClick={() => setTab('applicants')} className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-clay/30 hover:shadow-sm transition-all">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">View Applicants</p>
                  <p className="text-xs text-gray-400">Respond to volunteers</p>
                </button>
                <button onClick={() => setTab('bookings')} className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-clay/30 hover:shadow-sm transition-all">
                  <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">Manage Bookings</p>
                  <p className="text-xs text-gray-400">View confirmed stays</p>
                </button>
              </div>

              {/* Recent opportunities */}
              <h2 className="text-sm font-bold text-gray-800 mb-3">Recent Listings</h2>
              {opportunities.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <p className="text-sm text-gray-500 mb-3">You haven&apos;t posted any opportunities yet.</p>
                  <button onClick={() => setTab('opportunities')} className="text-sm font-semibold text-clay hover:underline">
                    Create your first listing &rarr;
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {opportunities.slice(0, 3).map((o: any) => (
                    <div key={o.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{o.title}</p>
                        <p className="text-xs text-gray-400">{CATEGORY_LABELS[o.category] || o.category} &middot; {o.number_of_volunteers} spots &middot; {o.duration_weeks} weeks</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${o.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {o.status || 'draft'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── OPPORTUNITIES ── */}
          {tab === 'opportunities' && (
            <OpportunitiesSection
              opportunities={opportunities}
              hostId={host?.id}
              onRefresh={refreshOpportunities}
            />
          )}

          {/* ── APPLICANTS ── */}
          {tab === 'applicants' && (
            <ApplicantsSection hostId={host?.id} />
          )}

          {/* ── BOOKINGS ── */}
          {tab === 'bookings' && (
            <BookingsSection hostId={host?.id} />
          )}

          {/* ── EARNINGS ── */}
          {tab === 'earnings' && (
            <EarningsSection />
          )}

          {/* ── REVIEWS ── */}
          {tab === 'reviews' && (
            <ReviewsSection hostId={host?.id} />
          )}

          {/* ── AVAILABILITY ── */}
          {tab === 'availability' && (
            <AvailabilitySection opportunities={opportunities} />
          )}

          {/* ── SETTINGS ── */}
          {tab === 'settings' && (
            <SettingsSection host={host} orgName={orgName} />
          )}
        </main>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   SECTION COMPONENTS
   ════════════════════════════════════════════ */

// ── Opportunities Section ──
function OpportunitiesSection({ opportunities, hostId, onRefresh }: { opportunities: any[]; hostId: string; onRefresh: () => void }) {
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: '', duration_weeks: '', number_of_volunteers: '', tasks: '', required_skills: '' })

  const resetForm = () => {
    setForm({ title: '', description: '', category: '', duration_weeks: '', number_of_volunteers: '', tasks: '', required_skills: '' })
    setEditingId(null)
    setShowCreate(false)
  }

  const startEdit = (opp: any) => {
    setForm({
      title: opp.title || '',
      description: opp.description || '',
      category: opp.category || '',
      duration_weeks: String(opp.duration_weeks || ''),
      number_of_volunteers: String(opp.number_of_volunteers || ''),
      tasks: (opp.tasks || []).join('\n'),
      required_skills: (opp.required_skills || []).join('\n'),
    })
    setEditingId(opp.id)
    setShowCreate(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      duration_weeks: parseInt(form.duration_weeks) || 4,
      number_of_volunteers: parseInt(form.number_of_volunteers) || 1,
      tasks: form.tasks.split('\n').filter(t => t.trim()),
      required_skills: form.required_skills.split('\n').filter(s => s.trim()),
      status: 'active',
    }

    if (editingId) {
      await updateHostOpportunity(editingId, payload)
    } else {
      const { createHostOpportunity } = await import('@/lib/supabase')
      await createHostOpportunity({ ...payload, host_id: hostId })
    }

    setSaving(false)
    resetForm()
    onRefresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this opportunity?')) return
    await deleteHostOpportunity(id)
    onRefresh()
  }

  const toggleStatus = async (opp: any) => {
    const newStatus = opp.status === 'active' ? 'paused' : 'active'
    await updateHostOpportunity(opp.id, { status: newStatus })
    onRefresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
          <p className="text-sm text-gray-500">Create, edit, and manage your volunteer listings.</p>
        </div>
        <button onClick={() => { resetForm(); setShowCreate(true) }} className="px-4 py-2 bg-clay text-white text-sm font-semibold rounded-lg hover:bg-clay/90 transition-colors flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Listing
        </button>
      </div>

      {/* Create/Edit form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">{editingId ? 'Edit Opportunity' : 'Create New Opportunity'}</h2>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-clay focus:ring-1 focus:ring-clay/20 outline-none" placeholder="e.g., Wildlife Conservation Assistant" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category *</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-clay outline-none">
                  <option value="">Select</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description *</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-clay focus:ring-1 focus:ring-clay/20 outline-none" placeholder="Describe the opportunity..." />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Duration (weeks) *</label>
                <input type="number" value={form.duration_weeks} onChange={e => setForm({ ...form, duration_weeks: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-clay outline-none" placeholder="e.g., 4" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Volunteers Needed *</label>
                <input type="number" value={form.number_of_volunteers} onChange={e => setForm({ ...form, number_of_volunteers: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-clay outline-none" placeholder="e.g., 2" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tasks (one per line)</label>
              <textarea value={form.tasks} onChange={e => setForm({ ...form, tasks: e.target.value })} rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-clay outline-none" placeholder="List main tasks..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Required Skills (one per line)</label>
              <textarea value={form.required_skills} onChange={e => setForm({ ...form, required_skills: e.target.value })} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-clay outline-none" placeholder="List skills..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.title || !form.category} className="px-5 py-2 bg-clay text-white text-sm font-semibold rounded-lg hover:bg-clay/90 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create Listing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Listings */}
      {opportunities.length === 0 && !showCreate ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <p className="text-sm text-gray-500 mb-3">No opportunities yet. Post your first listing to start receiving volunteers.</p>
          <button onClick={() => setShowCreate(true)} className="text-sm font-semibold text-clay hover:underline">Create Opportunity &rarr;</button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {opportunities.map((opp: any) => (
            <div key={opp.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-gray-800 truncate">{opp.title}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${opp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {opp.status || 'draft'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {CATEGORY_LABELS[opp.category] || opp.category} &middot; {opp.duration_weeks} weeks &middot; {opp.number_of_volunteers} volunteers
                  </p>
                  {opp.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{opp.description}</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleStatus(opp)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${opp.status === 'active' ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                    {opp.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                  <button onClick={() => startEdit(opp)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(opp.id)} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Applicants Section ──
function ApplicantsSection({ hostId }: { hostId: string }) {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { getHostApplications } = await import('@/lib/supabase')
        const { data } = await getHostApplications(hostId)
        setApplications(data || [])
      } catch { /* tables may not exist yet */ }
      setLoading(false)
    }
    load()
  }, [hostId])

  const handleRespond = async (id: string, status: string) => {
    const { updateApplicationStatus } = await import('@/lib/supabase')
    await updateApplicationStatus(id, status)
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  if (loading) return <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-clay mx-auto" /></div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Applicants</h1>
      <p className="text-sm text-gray-500 mb-6">Review and respond to volunteer applications.</p>

      {applications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <p className="text-sm text-gray-500">No applications yet. Once volunteers apply, they&apos;ll appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app: any) => (
            <div key={app.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{app.profiles?.full_name || 'Volunteer'}</p>
                  <p className="text-xs text-gray-400">{app.profiles?.email} &middot; Applied for: {app.host_opportunities?.title || 'Unknown'}</p>
                  {app.message && <p className="text-xs text-gray-500 mt-1">&ldquo;{app.message}&rdquo;</p>}
                </div>
                <div className="flex items-center gap-2">
                  {app.status === 'pending' ? (
                    <>
                      <button onClick={() => handleRespond(app.id, 'accepted')} className="text-xs px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 font-medium">Accept</button>
                      <button onClick={() => handleRespond(app.id, 'rejected')} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-medium">Decline</button>
                    </>
                  ) : (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${app.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {app.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Bookings Section ──
function BookingsSection({ hostId }: { hostId: string }) {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { getHostBookings } = await import('@/lib/supabase')
        const { data } = await getHostBookings(hostId)
        setBookings(data || [])
      } catch { /* tables may not exist yet */ }
      setLoading(false)
    }
    load()
  }, [hostId])

  if (loading) return <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-clay mx-auto" /></div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Bookings</h1>
      <p className="text-sm text-gray-500 mb-6">Manage confirmed volunteer stays and schedules.</p>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <p className="text-sm text-gray-500 mb-1">No bookings yet.</p>
          <p className="text-xs text-gray-400">Once you accept an applicant, confirmed bookings will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b: any) => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">{b.profiles?.full_name || 'Volunteer'}</p>
                <p className="text-xs text-gray-400">{b.host_opportunities?.title} &middot; {b.start_date} to {b.end_date}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : b.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                {b.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Earnings Section ──
function EarningsSection() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Earnings</h1>
      <p className="text-sm text-gray-500 mb-6">Track your financial overview and payouts.</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Earned', value: 'P0.00', sub: 'Lifetime' },
          { label: 'This Month', value: 'P0.00', sub: 'April 2026' },
          { label: 'Pending Payout', value: 'P0.00', sub: 'Next payout' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <p className="text-sm text-gray-500 mb-1">No earnings history.</p>
        <p className="text-xs text-gray-400">Earnings from premium features and services will appear here.</p>
      </div>
    </div>
  )
}

// ── Reviews Section ──
function ReviewsSection({ hostId }: { hostId: string }) {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { getHostReviews } = await import('@/lib/supabase')
        const { data } = await getHostReviews(hostId)
        setReviews(data || [])
      } catch { /* tables may not exist yet */ }
      setLoading(false)
    }
    load()
  }, [hostId])

  if (loading) return <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-clay mx-auto" /></div>

  const avgRating = reviews.length > 0 ? (reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : '—'

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Reviews & Ratings</h1>
      <p className="text-sm text-gray-500 mb-6">See what volunteers say about their experience with you.</p>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Average Rating</p>
          <div className="flex items-center gap-2 mt-1">
            <svg className="w-5 h-5 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            <span className="text-2xl font-bold text-gray-900">{avgRating}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Total Reviews</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{reviews.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Satisfaction</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {reviews.length > 0 ? `${Math.round((reviews.filter((r: any) => r.rating >= 4).length / reviews.length) * 100)}%` : '—'}
          </p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
          </div>
          <p className="text-sm text-gray-500">No reviews yet. Reviews from volunteers will appear here after their stay.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r: any) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(star => (
                    <svg key={star} className={`w-4 h-4 ${star <= (r.rating || 0) ? 'fill-amber-400' : 'fill-gray-200'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  ))}
                </div>
                <span className="text-xs font-medium text-gray-500">{r.profiles?.full_name || 'Anonymous'}</span>
                <span className="text-xs text-gray-300">&middot;</span>
                <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Availability Section ──
function AvailabilitySection({ opportunities }: { opportunities: any[] }) {
  const [availability, setAvailability] = useState<Record<string, boolean>>({})

  const months = ['May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026']

  const toggle = (month: string) => {
    setAvailability(prev => ({ ...prev, [month]: !prev[month] }))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Availability</h1>
      <p className="text-sm text-gray-500 mb-6">Set which months you can accept volunteers.</p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-bold text-gray-800 mb-4">Monthly Availability</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {months.map(m => (
            <button
              key={m}
              onClick={() => toggle(m)}
              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                availability[m]
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {m}
              <span className="block text-[10px] mt-0.5">
                {availability[m] ? 'Available' : 'Unavailable'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Per-opportunity status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-bold text-gray-800 mb-4">Listing Status</h2>
        {opportunities.length === 0 ? (
          <p className="text-sm text-gray-400">No listings to manage.</p>
        ) : (
          <div className="space-y-2">
            {opportunities.map((opp: any) => (
              <div key={opp.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{opp.title}</p>
                  <p className="text-xs text-gray-400">{opp.number_of_volunteers} spots &middot; {opp.duration_weeks} weeks</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${opp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {opp.status === 'active' ? 'Accepting' : 'Paused'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Settings Section ──
function SettingsSection({ host, orgName }: { host: any; orgName: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">Manage your host profile and preferences.</p>

      <div className="space-y-4">
        {/* Profile info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Organization Profile</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Organization Name</p>
              <p className="font-medium text-gray-800">{orgName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Host Type</p>
              <p className="font-medium text-gray-800">{host?.host_profiles?.host_type || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Location</p>
              <p className="font-medium text-gray-800">
                {host?.host_profiles?.location_city && host?.host_profiles?.location_country
                  ? `${host.host_profiles.location_city}, ${host.host_profiles.location_country}`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Status</p>
              <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                {host?.status || 'Unknown'}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link href="/become-a-host" className="text-sm text-clay font-medium hover:underline">
              Edit Profile &rarr;
            </Link>
          </div>
        </div>

        {/* Verification */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Verification</h2>
          <div className="space-y-2">
            {[
              { label: 'ID Document', uploaded: !!host?.host_verification?.id_document_url },
              { label: 'Selfie Verification', uploaded: !!host?.host_verification?.selfie_verification_url },
              { label: 'Proof of Address', uploaded: !!host?.host_verification?.proof_of_address_url },
              { label: 'Business Registration', uploaded: !!host?.host_verification?.business_registration_url },
            ].map(doc => (
              <div key={doc.label} className="flex items-center justify-between py-1.5">
                <p className="text-sm text-gray-700">{doc.label}</p>
                {doc.uploaded ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Uploaded
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Not uploaded</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-xl border border-red-100 p-6">
          <h2 className="text-sm font-bold text-red-600 mb-2">Danger Zone</h2>
          <p className="text-xs text-gray-500 mb-4">Permanently delete your host account and all associated data.</p>
          <button className="text-xs px-4 py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors font-medium">
            Delete Host Account
          </button>
        </div>
      </div>
    </div>
  )
}
