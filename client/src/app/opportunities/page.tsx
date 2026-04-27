'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getPublicOpportunities, getCurrentUser } from '@/lib/supabase'

/* ── Types ─────────────────────────────────────── */

interface Opportunity {
  id: string
  title: string
  description: string
  hostType: string
  hostName: string
  category: string
  country: string
  city: string
  duration: string
  hoursPerWeek: number
  spots: number
  rating: number
  reviewCount: number
  image: string
  tasks: string[]
  accommodation: string
  meals: string
  wifi: boolean
  training: boolean
  certificate: boolean
  badges: string[]
  verified: boolean
  urgentNeed: boolean
}

/* ── Sample fallback data ─────────────────────── */

const SAMPLE_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'sample-1',
    title: 'Wildlife Conservation Assistant',
    description: 'Join our team protecting endangered species in the Okavango Delta.',
    hostType: 'NGO',
    hostName: 'Delta Wildlife Trust',
    category: 'CONSERVATION',
    country: 'Botswana',
    city: 'Maun',
    duration: '8-12 weeks',
    hoursPerWeek: 25,
    spots: 2,
    rating: 4.9,
    reviewCount: 47,
    image: '/images/imagesconservation.jpg',
    tasks: ['Animal monitoring', 'Data collection', 'Habitat restoration'],
    accommodation: 'Private Room',
    meals: '3 Meals Daily',
    wifi: true,
    training: true,
    certificate: true,
    badges: ['Higher Approval', 'Sustainable Project'],
    verified: true,
    urgentNeed: false,
  },
  {
    id: 'sample-2',
    title: 'Community Teaching Program',
    description: 'Make a difference teaching English and Math to underprivileged youth.',
    hostType: 'Non-Profit School',
    hostName: 'Bright Futures Academy',
    category: 'EDUCATION',
    country: 'Kenya',
    city: 'Nairobi',
    duration: '4-12 weeks',
    hoursPerWeek: 20,
    spots: 3,
    rating: 4.7,
    reviewCount: 89,
    image: '/images/imageseducation.jpg',
    tasks: ['Teaching English', 'After-school tutoring', 'Sports activities'],
    accommodation: 'Shared Dorm',
    meals: '3 Meals Daily',
    wifi: true,
    training: true,
    certificate: true,
    badges: ['Top Host', 'High Impact'],
    verified: true,
    urgentNeed: true,
  },
  {
    id: 'sample-3',
    title: 'Organic Farm & Permaculture Helper',
    description: 'Learn sustainable farming on our certified organic farm.',
    hostType: 'Eco Farm',
    hostName: 'Green Valley Organics',
    category: 'AGRICULTURE',
    country: 'South Africa',
    city: 'Stellenbosch',
    duration: '2-8 weeks',
    hoursPerWeek: 30,
    spots: 4,
    rating: 5.0,
    reviewCount: 32,
    image: '/images/imagesfarming.jpg',
    tasks: ['Planting & harvesting', 'Animal care', 'Composting'],
    accommodation: 'Private Room',
    meals: '2 Meals Daily',
    wifi: false,
    training: true,
    certificate: false,
    badges: ['Sustainable Project', 'Farm Stay'],
    verified: true,
    urgentNeed: false,
  },
  {
    id: 'sample-4',
    title: 'Safari Lodge Guest Experience',
    description: 'Work at a luxury eco-lodge assisting with guest services and wildlife drives.',
    hostType: 'Guest Lodge',
    hostName: 'Savanna Sunset Lodge',
    category: 'TOURISM',
    country: 'Botswana',
    city: 'Kasane',
    duration: '4-16 weeks',
    hoursPerWeek: 25,
    spots: 2,
    rating: 4.8,
    reviewCount: 56,
    image: '/images/imagesconservation.jpg',
    tasks: ['Guest services', 'Safari assistance', 'Conservation talks'],
    accommodation: 'Private Room',
    meals: '3 Meals Daily',
    wifi: true,
    training: true,
    certificate: true,
    badges: ['Premium Experience', 'Career Opportunity'],
    verified: true,
    urgentNeed: false,
  },
]

/* ── Category images (fallback by category) ───── */

const CATEGORY_IMAGES: Record<string, string> = {
  CONSERVATION: '/images/imagesconservation.jpg',
  EDUCATION: '/images/imageseducation.jpg',
  AGRICULTURE: '/images/imagesfarming.jpg',
  COMMUNITY: '/images/imageseducation.jpg',
  HEALTHCARE: '/images/imagesconservation.jpg',
  TOURISM: '/images/imagesfarming.jpg',
  TECHNOLOGY: '/images/imageseducation.jpg',
  ARTS_CULTURE: '/images/imagesconservation.jpg',
  CONSTRUCTION: '/images/imagesfarming.jpg',
  SOCIAL_WORK: '/images/imageseducation.jpg',
}

/* ── Transform DB opportunity to page format ──── */

function transformDbOpportunity(opp: any): Opportunity {
  const profile = opp.hosts?.host_profiles?.[0] || opp.hosts?.host_profiles || {}
  return {
    id: opp.id,
    title: opp.title || 'Untitled Opportunity',
    description: opp.description || '',
    hostType: profile.host_type || 'Host',
    hostName: profile.organization_name || 'Host',
    category: opp.category || 'COMMUNITY',
    country: profile.location_country || '',
    city: profile.location_city || '',
    duration: `${opp.duration_weeks || 4} weeks`,
    hoursPerWeek: 25,
    spots: opp.number_of_volunteers || 1,
    rating: 0,
    reviewCount: 0,
    image: CATEGORY_IMAGES[opp.category] || '/images/imagesconservation.jpg',
    tasks: opp.tasks || opp.required_skills || [],
    accommodation: opp.benefits?.accommodation ? 'Accommodation Included' : '',
    meals: opp.benefits?.meals ? 'Meals Included' : '',
    wifi: !!opp.benefits?.internet,
    training: true,
    certificate: false,
    badges: ['New Listing'],
    verified: true,
    urgentNeed: false,
  }
}

const CATEGORIES = [
  { v: 'AGRICULTURE', l: 'Farming' },
  { v: 'COMMUNITY', l: 'NGO / Social Impact' },
  { v: 'EDUCATION', l: 'Education' },
  { v: 'TOURISM', l: 'Guest Lodge' },
  { v: 'CONSERVATION', l: 'Community Projects' },
  { v: 'HEALTHCARE', l: 'Apprenticeship Programs' },
]

const LOCATIONS = ['Botswana', 'South Africa', 'Kenya', 'Zimbabwe', 'Tanzania', 'Namibia']

const DURATIONS = [
  { v: '1', l: '1 week' },
  { v: '2-4', l: '2-4 weeks' },
  { v: '1-3m', l: '1-3 months' },
  { v: 'long', l: 'Long-term stay' },
]

/* ── Component ────────────────────────────────── */

export default function OpportunitiesPage() {
  const router = useRouter()
  const [opportunities, setOpportunities] = useState<Opportunity[]>(SAMPLE_OPPORTUNITIES)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [duration, setDuration] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  
  // Benefit filters
  const [filterWifi, setFilterWifi] = useState(false)
  const [filterMeals, setFilterMeals] = useState(false)
  const [filterAccom, setFilterAccom] = useState(false)
  const [filterTraining, setFilterTraining] = useState(false)
  const [filterCertificate, setFilterCertificate] = useState(false)

  // Check if user is logged in and fetch opportunities
  useEffect(() => {
    const init = async () => {
      // Check login status
      const user = await getCurrentUser()
      setIsLoggedIn(!!user)
      
      // Fetch opportunities
      try {
        const { data, error } = await getPublicOpportunities()
        if (!error && data && data.length > 0) {
          const dbOpps = data.map(transformDbOpportunity)
          setOpportunities([...dbOpps, ...SAMPLE_OPPORTUNITIES])
        }
      } catch {
        // On error, keep sample data
      }
    }
    init()
  }, [])

  const hasActiveFilters = search || category || location || duration || filterWifi || filterMeals || filterAccom || filterTraining || filterCertificate

  const filtered = opportunities.filter((o) => {
    if (category && o.category !== category) return false
    if (location && o.country !== location) return false
    if (search) {
      const s = search.toLowerCase()
      const match = o.title.toLowerCase().includes(s) ||
        o.description.toLowerCase().includes(s) ||
        o.city.toLowerCase().includes(s) ||
        o.country.toLowerCase().includes(s) ||
        o.hostName.toLowerCase().includes(s)
      if (!match) return false
    }
    if (filterWifi && !o.wifi) return false
    if (filterMeals && !o.meals) return false
    if (filterAccom && !o.accommodation) return false
    if (filterTraining && !o.training) return false
    if (filterCertificate && !o.certificate) return false
    return true
  })

  const clearAll = () => {
    setSearch(''); setCategory(''); setLocation(''); setDuration('')
    setFilterWifi(false); setFilterMeals(false); setFilterAccom(false)
    setFilterTraining(false); setFilterCertificate(false)
  }

  const handleApply = (opportunityId: string) => {
    if (!isLoggedIn) {
      // Redirect to volunteer login page
      router.push('/volunteer/login')
    } else {
      // For now, show confirmation - detail page can be added later
      alert('Application feature coming soon! You will be able to apply to this opportunity.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f7f7f7', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>

      {/* ══ TOP NAV BAR ══ */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e6e6e6', padding: '12px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: '#111', fontSize: '14px', fontWeight: 500 }}>
            <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </a>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#111' }}>Browse Opportunities</h1>
          <div style={{ width: '100px' }}></div>
        </div>
      </div>

      {/* ══ TOP SEARCH BAR ══ */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e6e6e6', padding: '16px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ flex: '1 1 300px', position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search opportunities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', height: '44px', paddingLeft: '44px', paddingRight: '16px', fontSize: '14px', border: '1px solid #e6e6e6', borderRadius: '8px', outline: 'none' }}
              />
            </div>
            {/* Category */}
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ height: '44px', padding: '0 16px', fontSize: '14px', border: '1px solid #e6e6e6', borderRadius: '8px', backgroundColor: '#fff', cursor: 'pointer', minWidth: '160px' }}>
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
            {/* Duration */}
            <select value={duration} onChange={(e) => setDuration(e.target.value)} style={{ height: '44px', padding: '0 16px', fontSize: '14px', border: '1px solid #e6e6e6', borderRadius: '8px', backgroundColor: '#fff', cursor: 'pointer', minWidth: '140px' }}>
              <option value="">Any Duration</option>
              {DURATIONS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
            </select>
            {/* Location */}
            <select value={location} onChange={(e) => setLocation(e.target.value)} style={{ height: '44px', padding: '0 16px', fontSize: '14px', border: '1px solid #e6e6e6', borderRadius: '8px', backgroundColor: '#fff', cursor: 'pointer', minWidth: '150px' }}>
              <option value="">All Locations</option>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            {/* Search Button */}
            <button style={{ height: '44px', width: '44px', backgroundColor: '#0a7d3b', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: '20px', height: '20px', color: '#fff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        
        {/* Mobile Filter Toggle */}
        <button onClick={() => setShowFilters(!showFilters)} style={{ display: 'none', marginBottom: '16px', padding: '10px 16px', backgroundColor: '#fff', border: '1px solid #e6e6e6', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }} className="mobile-filter-btn">
          Filters {hasActiveFilters && '•'}
        </button>

        <div style={{ display: 'flex', gap: '24px' }}>
          
          {/* ══ LEFT SIDEBAR (260px) ══ */}
          <aside style={{ width: '260px', flexShrink: 0 }} className="desktop-sidebar">
            <div style={{ position: 'sticky', top: '100px' }}>
              
              {/* Search by Opportunity */}
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e6e6e6', padding: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111', marginBottom: '12px' }}>Search by Opportunity</h3>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="e.g. Wildlife, Teaching..."
                  style={{ width: '100%', height: '40px', padding: '0 12px', fontSize: '13px', border: '1px solid #e6e6e6', borderRadius: '8px', outline: 'none' }}
                />
              </div>

              {/* Popular Filters */}
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e6e6e6', padding: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111', marginBottom: '12px' }}>Popular Filters</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                    <input type="checkbox" checked={filterWifi} onChange={(e) => setFilterWifi(e.target.checked)} style={{ width: '16px', height: '16px' }} /> WiFi Included
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                    <input type="checkbox" checked={filterMeals} onChange={(e) => setFilterMeals(e.target.checked)} style={{ width: '16px', height: '16px' }} /> Meals Included
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                    <input type="checkbox" checked={filterAccom} onChange={(e) => setFilterAccom(e.target.checked)} style={{ width: '16px', height: '16px' }} /> Accommodation
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                    <input type="checkbox" checked={filterTraining} onChange={(e) => setFilterTraining(e.target.checked)} style={{ width: '16px', height: '16px' }} /> Training
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                    <input type="checkbox" checked={filterCertificate} onChange={(e) => setFilterCertificate(e.target.checked)} style={{ width: '16px', height: '16px' }} /> Certificate
                  </label>
                </div>
              </div>

              {/* Categories */}
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e6e6e6', padding: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111', marginBottom: '12px' }}>Categories</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {CATEGORIES.map((c) => (
                    <label key={c.v} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                      <input type="checkbox" checked={category === c.v} onChange={() => setCategory(category === c.v ? '' : c.v)} style={{ width: '16px', height: '16px' }} /> {c.l}
                    </label>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e6e6e6', padding: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111', marginBottom: '12px' }}>Duration</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {DURATIONS.map((d) => (
                    <label key={d.v} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                      <input type="checkbox" checked={duration === d.v} onChange={() => setDuration(duration === d.v ? '' : d.v)} style={{ width: '16px', height: '16px' }} /> {d.l}
                    </label>
                  ))}
                </div>
              </div>

              {hasActiveFilters && (
                <button onClick={clearAll} style={{ width: '100%', marginTop: '16px', padding: '10px', fontSize: '13px', color: '#0a7d3b', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                  Clear all filters
                </button>
              )}
            </div>
          </aside>

          {/* ══ LISTINGS ══ */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Results Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#6b7280' }}><strong style={{ color: '#111' }}>{filtered.length}</strong> opportunities found</p>
              {hasActiveFilters && <button onClick={clearAll} style={{ fontSize: '13px', color: '#0a7d3b', background: 'none', border: 'none', cursor: 'pointer' }}>Clear filters</button>}
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filtered.map((o) => (
                <div key={o.id} style={{ display: 'flex', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e6e6e6', overflow: 'hidden' }}>
                  
                  {/* Image */}
                  <div style={{ width: '280px', height: '220px', flexShrink: 0, position: 'relative', backgroundColor: '#f3f4f6' }}>
                    <img src={o.image} alt={o.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {o.urgentNeed && <span style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px' }}>Needs Help Now</span>}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, padding: '20px', minWidth: 0 }}>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{o.hostType} · {o.city}, {o.country}</p>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111', marginBottom: '8px', lineHeight: 1.3 }}>{o.title}</h3>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{o.description}</p>
                    
                    {/* Tasks */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                      {o.tasks.slice(0, 3).map((t) => <span key={t} style={{ fontSize: '11px', backgroundColor: '#f3f4f6', color: '#4b5563', padding: '4px 8px', borderRadius: '4px' }}>{t}</span>)}
                    </div>
                    
                    {/* Benefits */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', marginBottom: '12px' }}>
                      {o.accommodation && <span style={{ color: '#0a7d3b', fontWeight: 500 }}>{o.accommodation}</span>}
                      {o.meals && <span style={{ color: '#0a7d3b', fontWeight: 500 }}>{o.meals}</span>}
                      {o.wifi && <span style={{ color: '#0a7d3b', fontWeight: 500 }}>Free WiFi</span>}
                      {o.training && <span style={{ color: '#0a7d3b', fontWeight: 500 }}>Training</span>}
                    </div>
                    
                    {/* Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {o.verified && <span style={{ fontSize: '10px', fontWeight: 600, color: '#0a7d3b', backgroundColor: 'rgba(10,125,59,0.1)', padding: '4px 8px', borderRadius: '4px' }}>✓ Verified</span>}
                      {o.badges.map((b) => <span key={b} style={{ fontSize: '10px', fontWeight: 500, color: '#6b7280', backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>{b}</span>)}
                    </div>
                  </div>

                  {/* Action Area */}
                  <div style={{ width: '180px', padding: '20px', backgroundColor: '#fafafa', borderLeft: '1px solid #e6e6e6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    {o.rating > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '36px', height: '36px', backgroundColor: '#0a7d3b', color: '#fff', fontSize: '14px', fontWeight: 700, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{o.rating}</span>
                          <div>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: '#111' }}>{o.rating >= 4.8 ? 'Exceptional' : 'Excellent'}</p>
                            <p style={{ fontSize: '11px', color: '#6b7280' }}>{o.reviewCount} reviews</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                      <p style={{ marginBottom: '4px' }}>Duration: <strong style={{ color: '#374151' }}>{o.duration}</strong></p>
                      <p>Volunteers: <strong style={{ color: '#374151' }}>{o.spots}</strong></p>
                    </div>
                    <button onClick={() => handleApply(o.id)} style={{ display: 'block', width: '100%', padding: '10px', backgroundColor: '#0a7d3b', color: '#fff', fontSize: '13px', fontWeight: 600, textAlign: 'center', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                      {isLoggedIn ? 'Apply Now' : 'Login to Apply'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e6e6e6' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111', marginBottom: '8px' }}>No opportunities found</h3>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>Try adjusting your filters</p>
                <button onClick={clearAll} style={{ fontSize: '14px', color: '#0a7d3b', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Clear all filters</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS for responsive */}
      <style jsx>{`
        @media (max-width: 1024px) {
          .desktop-sidebar { display: none !important; }
          .mobile-filter-btn { display: inline-flex !important; }
        }
        @media (max-width: 768px) {
          div[style*="width: 280px"] { width: 100% !important; height: 200px !important; }
          div[style*="width: 180px"] { width: 100% !important; border-left: none !important; border-top: 1px solid #e6e6e6 !important; }
          div[style*="display: flex"][style*="backgroundColor: '#fff'"][style*="borderRadius: '12px'"] { flex-direction: column !important; }
        }
      `}</style>
    </div>
  )
}
