'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CreateOpportunityPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    
    const opportunityData = {
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      tasks: formData.get('tasks')?.toString().split('\n').filter(t => t.trim()),
      duration_weeks: parseInt(formData.get('duration_weeks') as string),
      number_of_volunteers: parseInt(formData.get('number_of_volunteers') as string),
      required_skills: formData.get('required_skills')?.toString().split('\n').filter(s => s.trim()),
      benefits: {
        accommodation: formData.get('benefit_accommodation') === 'on',
        meals: formData.get('benefit_meals') === 'on',
        laundry: formData.get('benefit_laundry') === 'on',
        internet: formData.get('benefit_internet') === 'on',
        transport: formData.get('benefit_transport') === 'on',
        training: formData.get('benefit_training') === 'on',
      },
      location_country: formData.get('location_country'),
      location_city: formData.get('location_city'),
    }

    try {
      // For now, just simulate success and redirect
      // In production, this would call your API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      router.push('/host/dashboard')
    } catch (err) {
      setError('Failed to create opportunity. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-ivory py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/host/dashboard" className="text-clay hover:text-earth mb-4 inline-flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-earth mt-4 mb-2">Create Opportunity</h1>
          <p className="text-gray-600">Post a new volunteer opportunity on the platform</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8">
          <div className="space-y-6">
            <div className="form-group">
              <label className="form-label">Opportunity Title *</label>
              <input
                name="title"
                required
                className="form-input"
                placeholder="e.g., Wildlife Conservation Assistant, Community Teacher"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select name="category" required className="form-input">
                  <option value="">Select category</option>
                  <option value="CONSERVATION">Conservation & Environment</option>
                  <option value="EDUCATION">Education & Teaching</option>
                  <option value="COMMUNITY">Community Development</option>
                  <option value="AGRICULTURE">Agriculture & Farming</option>
                  <option value="HEALTHCARE">Healthcare & Medical</option>
                  <option value="ARTS_CULTURE">Arts & Culture</option>
                  <option value="TECHNOLOGY">Technology & IT</option>
                  <option value="TOURISM">Tourism & Hospitality</option>
                  <option value="CONSTRUCTION">Construction & Building</option>
                  <option value="SOCIAL_WORK">Social Work</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Duration (weeks) *</label>
                <input
                  name="duration_weeks"
                  type="number"
                  min="1"
                  max="52"
                  required
                  className="form-input"
                  placeholder="e.g., 4, 8, 12"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea
                name="description"
                required
                className="form-input"
                rows={5}
                placeholder="Describe the opportunity, what volunteers will be doing, and what they can expect..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tasks & Responsibilities</label>
              <textarea
                name="tasks"
                className="form-input"
                rows={4}
                placeholder="List the main tasks (one per line)&#10;e.g.,&#10;Assist with animal care&#10;Help with feeding schedules&#10;Maintain enclosures"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="form-group">
                <label className="form-label">Number of Volunteers *</label>
                <input
                  name="number_of_volunteers"
                  type="number"
                  min="1"
                  max="20"
                  required
                  className="form-input"
                  placeholder="e.g., 1, 2, 5"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Required Skills</label>
                <textarea
                  name="required_skills"
                  className="form-input"
                  rows={3}
                  placeholder="List required skills (one per line)"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="form-group">
                <label className="form-label">Country *</label>
                <select name="location_country" required className="form-input">
                  <option value="">Select country</option>
                  <option value="Botswana">Botswana</option>
                  <option value="South Africa">South Africa</option>
                  <option value="Namibia">Namibia</option>
                  <option value="Zimbabwe">Zimbabwe</option>
                  <option value="Zambia">Zambia</option>
                  <option value="Kenya">Kenya</option>
                  <option value="Tanzania">Tanzania</option>
                  <option value="Ghana">Ghana</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">City *</label>
                <input
                  name="location_city"
                  required
                  className="form-input"
                  placeholder="Enter city name"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label font-semibold text-lg mb-4 block">Benefits Offered</label>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    name="benefit_accommodation"
                    type="checkbox"
                    className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay"
                  />
                  <span>Accommodation</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    name="benefit_meals"
                    type="checkbox"
                    className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay"
                  />
                  <span>Meals</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    name="benefit_laundry"
                    type="checkbox"
                    className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay"
                  />
                  <span>Laundry Facilities</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    name="benefit_internet"
                    type="checkbox"
                    className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay"
                  />
                  <span>Internet Access</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    name="benefit_transport"
                    type="checkbox"
                    className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay"
                  />
                  <span>Local Transport</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    name="benefit_training"
                    type="checkbox"
                    className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay"
                  />
                  <span>Training & Development</span>
                </label>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-6">
              <Link href="/host/dashboard" className="btn btn-outline">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
              >
                {isSubmitting ? 'Creating...' : 'Create Opportunity'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
