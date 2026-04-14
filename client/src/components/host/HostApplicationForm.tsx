'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { FileUpload } from '@/components/ui/FileUpload'
import { ProgressIndicator } from '@/components/ui/ProgressIndicator'
import { cn, validateFile } from '@/lib/utils'
import {
  createHost,
  createHostOpportunity,
  createHostProfile,
  createHostReference,
  createHostVerification,
  updateHost,
  updateHostProfile,
  updateHostVerification,
  uploadVerificationDocument,
} from '@/lib/supabase'

interface HostApplicationFormProps {
  userId: string
  existingHost?: any
  onComplete: () => void
}

const steps = [
  { id: 1, title: 'Identity', description: 'Basic information' },
  { id: 2, title: 'Verification', description: 'Upload documents' },
  { id: 3, title: 'Location', description: 'Where you\'re located' },
  { id: 4, title: 'About', description: 'Tell your story' },
  { id: 5, title: 'Opportunity', description: 'What you\'re offering' },
  { id: 6, title: 'Benefits', description: 'What volunteers get' },
  { id: 7, title: 'Safety', description: 'Safety information' },
  { id: 8, title: 'References', description: 'Professional references' },
  { id: 9, title: 'Declaration', description: 'Final confirmation' },
]

export function HostApplicationForm({ userId, existingHost, onComplete }: HostApplicationFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hostId, setHostId] = useState(existingHost?.id)
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({})
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({})

  const { register, handleSubmit, watch, trigger, formState: { errors: formErrors } } = useForm<Record<string, any>>({
    mode: 'onChange',
    defaultValues: existingHost ? {
      // Pre-fill existing data if available
      organization_name: existingHost.host_profiles?.organization_name,
      host_type: existingHost.host_profiles?.host_type,
      // ... other fields
    } : {}
  })

  const totalSteps = steps.length
  const progress = (currentStep / totalSteps) * 100
  const mergedErrors = { ...formErrors, ...customErrors } as any

  const handleFileUpload = async (fileType: string, file: File) => {
    const validation = validateFile(file)
    if (!validation.valid) {
      setCustomErrors(prev => ({ ...prev, [fileType]: validation.error || 'Invalid file' }))
      return
    }

    setCustomErrors(prev => {
      const next = { ...prev }
      delete next[fileType]
      return next
    })

    const { data, error } = await uploadVerificationDocument(userId, file, fileType)

    if (error || !data?.url) {
      setCustomErrors(prev => ({
        ...prev,
        [fileType]: 'Upload failed. Please try again.',
      }))
      return
    }

    setUploadedFiles(prev => ({ ...prev, [fileType]: data.url }))
  }

  const validateStep = async () => {
    const stepFields: Record<number, string[]> = {
      1: ['full_name', 'organization_name', 'host_type', 'role_in_organization', 'phone', 'email'],
      2: [],
      3: ['location_country', 'location_city', 'physical_address'],
      4: ['description', 'why_host_volunteers'],
      5: ['opportunity_title', 'category', 'opportunity_description', 'duration_weeks', 'number_of_volunteers'],
      6: [],
      7: ['safe_environment', 'emergency_contact_name', 'emergency_contact_phone', 'supervision_details'],
      8: ['reference_name', 'reference_phone'],
      9: ['declaration_truthful', 'declaration_benefits', 'declaration_rules', 'declaration_background_check', 'electronic_signature'],
    }

    if (currentStep === 2) {
      const requiredUploads = ['id_document', 'selfie_verification', 'proof_of_address']
      const missingUploads = requiredUploads.filter((key) => !uploadedFiles[key])

      if (missingUploads.length > 0) {
        setCustomErrors((prev) => ({
          ...prev,
          submit: 'Please upload all required verification documents before continuing.',
        }))
        return false
      }

      setCustomErrors((prev) => {
        const next = { ...prev }
        delete next.submit
        return next
      })

      return true
    }

    const fields = [...(stepFields[currentStep] || [])]

    if (currentStep === 6) {
      if (watch('benefit_accommodation')) fields.push('accommodation_type')
      if (watch('benefit_meals')) fields.push('meals_per_day')
    }

    const isValid = await trigger(fields as any, { shouldFocus: true })
    return isValid
  }

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    setCustomErrors({})

    try {
      const requiredUploads = ['id_document', 'selfie_verification', 'proof_of_address']
      const missingUploads = requiredUploads.filter((key) => !uploadedFiles[key])

      if (missingUploads.length > 0) {
        setCustomErrors((prev) => ({
          ...prev,
          submit: 'Please upload all required verification documents before submitting.',
        }))
        setCurrentStep(2)
        return
      }

      // Create or update host record
      let hostRecord = existingHost
      if (!hostId) {
        const { data: newHost, error } = await createHost(userId)
        if (error) throw error
        hostRecord = newHost
        setHostId(newHost.id)
      }

      // Create/update host profile
      const profileData = {
        host_id: hostRecord.id,
        organization_name: data.organization_name,
        host_type: data.host_type,
        role_in_org: data.role_in_organization,
        description: data.description,
        mission: data.mission,
        location_country: data.location_country,
        location_city: data.location_city,
        physical_address: data.physical_address,
        years_operating: data.years_operating,
        ownership_type: data.ownership_type || null,
      }

      if (existingHost?.host_profiles) {
        await updateHostProfile(existingHost.host_profiles.id, profileData)
      } else {
        await createHostProfile(profileData)
      }

      // Create/update verification
      const verificationData = {
        host_id: hostRecord.id,
        id_document_url: uploadedFiles.id_document,
        selfie_verification_url: uploadedFiles.selfie_verification,
        proof_of_address_url: uploadedFiles.proof_of_address,
        business_registration_url: uploadedFiles.business_registration,
      }

      if (existingHost?.host_verification) {
        await updateHostVerification(existingHost.host_verification.id, verificationData)
      } else {
        await createHostVerification(verificationData)
      }

      // Create opportunity
      const opportunityData = {
        host_id: hostRecord.id,
        title: data.opportunity_title,
        description: data.opportunity_description,
        category: data.category,
        tasks: data.tasks?.split('\n').filter((t: string) => t.trim()) || [],
        duration_weeks: data.duration_weeks,
        benefits: {
          accommodation: data.benefit_accommodation,
          meals: data.benefit_meals,
          laundry: data.benefit_laundry,
          internet: data.benefit_internet,
          transport: data.benefit_transport,
          training: data.benefit_training,
          accommodation_details: data.benefit_accommodation ? {
            type: data.accommodation_type || null,
            bedding_provided: !!data.bedding_provided,
          } : null,
          meals_details: data.benefit_meals ? {
            meals_per_day: data.meals_per_day || null,
            vegetarian_options: !!data.vegetarian_options,
          } : null,
          internet_details: data.benefit_internet ? {
            wifi_available: !!data.wifi_available,
            reliability: data.internet_reliability || null,
          } : null,
        },
        required_skills: data.required_skills?.split('\n').filter((s: string) => s.trim()) || [],
        number_of_volunteers: data.number_of_volunteers,
      }

      await createHostOpportunity(opportunityData)

      // Create references
      if (data.reference_name) {
        const referenceData = {
          host_id: hostRecord.id,
          reference_name: data.reference_name,
          relationship: data.reference_relationship,
          phone: data.reference_phone,
          email: data.reference_email,
          social_links: data.reference_social ? { website: data.reference_social } : null,
        }
        await createHostReference(referenceData)
      }

      // Update host status to SUBMITTED
      await updateHost(hostRecord.id, { status: 'SUBMITTED' })

      onComplete()
    } catch (error) {
      console.error('Error submitting application:', error)
      setCustomErrors({ submit: 'Failed to submit application. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = async () => {
    const valid = await validateStep()

    if (!valid) {
      return
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <IdentityStep register={register} watch={watch} errors={mergedErrors} />
      case 2:
        return <VerificationStep 
          uploadedFiles={uploadedFiles}
          onFileUpload={handleFileUpload}
          errors={mergedErrors}
        />
      case 3:
        return <LocationStep register={register} watch={watch} errors={mergedErrors} />
      case 4:
        return <AboutStep register={register} watch={watch} errors={mergedErrors} />
      case 5:
        return <OpportunityStep register={register} watch={watch} errors={mergedErrors} />
      case 6:
        return <BenefitsStep register={register} watch={watch} errors={mergedErrors} />
      case 7:
        return <SafetyStep register={register} watch={watch} errors={mergedErrors} />
      case 8:
        return <ReferencesStep register={register} watch={watch} errors={mergedErrors} />
      case 9:
        return <DeclarationStep register={register} watch={watch} errors={mergedErrors} />
      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      {/* Progress Indicator */}
      <ProgressIndicator 
        steps={steps}
        currentStep={currentStep}
        progress={progress}
      />

      {/* Step Content */}
      <div className="mt-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-earth mb-2">
            {steps[currentStep - 1].title}
          </h2>
          <p className="text-gray-600">
            {steps[currentStep - 1].description}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {renderStep()}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={cn(
                "btn btn-secondary",
                currentStep === 1 && "opacity-50 cursor-not-allowed"
              )}
            >
              Previous
            </button>

            {currentStep === totalSteps ? (
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
            ) : (
              <button
                type="button"
                onClick={nextStep}
                className="btn btn-primary"
              >
                Next Step
              </button>
            )}
          </div>
        </form>

        {customErrors.submit && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{customErrors.submit}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Step Components
function IdentityStep({ register, watch, errors }: any) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input
            {...register('full_name', { required: 'Full name is required' })}
            className="form-input"
            placeholder="Enter your full name"
          />
          {errors.full_name && <p className="form-error">{errors.full_name.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Organization Name *</label>
          <input
            {...register('organization_name', { required: 'Organization name is required' })}
            className="form-input"
            placeholder="Enter organization name"
          />
          {errors.organization_name && <p className="form-error">{errors.organization_name.message}</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="form-group">
          <label className="form-label">Host Type *</label>
          <select {...register('host_type', { required: 'Host type is required' })} className="form-input">
            <option value="">Select host type</option>
            <option value="NONPROFIT">NGO</option>
            <option value="BUSINESS">Farm</option>
            <option value="SCHOOL">School</option>
            <option value="BUSINESS">Lodge</option>
            <option value="COMMUNITY">Community Project</option>
            <option value="BUSINESS">Business</option>
          </select>
          {errors.host_type && <p className="form-error">{errors.host_type.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Your Role in Organization *</label>
          <input
            {...register('role_in_organization', { required: 'Role is required' })}
            className="form-input"
            placeholder="e.g., Director, Manager, Coordinator"
          />
          {errors.role_in_organization && <p className="form-error">{errors.role_in_organization.message}</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="form-group">
          <label className="form-label">Phone Number *</label>
          <input
            {...register('phone', { required: 'Phone number is required' })}
            className="form-input"
            placeholder="+267 123 456 789"
          />
          {errors.phone && <p className="form-error">{errors.phone.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">WhatsApp Number</label>
          <input
            {...register('whatsapp')}
            className="form-input"
            placeholder="+267 123 456 789 (optional)"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Email Address *</label>
        <input
          {...register('email', { 
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
          className="form-input"
          type="email"
          placeholder="your.email@example.com"
        />
        {errors.email && <p className="form-error">{errors.email.message}</p>}
      </div>
    </div>
  )
}

function VerificationStep({ uploadedFiles, onFileUpload, errors }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800">
          <strong>Verification Required:</strong> To ensure trust and safety, please upload the following documents. 
          All documents are securely stored and only used for verification purposes.
        </p>
      </div>

      <FileUpload
        label="ID Document or Passport *"
        description="Upload a clear photo of your government-issued ID or passport"
        accept="image/*,.pdf"
        required
        value={uploadedFiles.id_document}
        onChange={(file) => onFileUpload('id_document', file)}
        error={errors.id_document}
      />

      <FileUpload
        label="Selfie with ID Document *"
        description="Take a selfie holding your ID document next to your face"
        accept="image/*"
        required
        value={uploadedFiles.selfie_verification}
        onChange={(file) => onFileUpload('selfie_verification', file)}
        error={errors.selfie_verification}
      />

      <FileUpload
        label="Proof of Address *"
        description="Utility bill, bank statement, or official letter showing your current address"
        accept="image/*,.pdf"
        required
        value={uploadedFiles.proof_of_address}
        onChange={(file) => onFileUpload('proof_of_address', file)}
        error={errors.proof_of_address}
      />

      <FileUpload
        label="Business Registration Document"
        description="Business registration, nonprofit certificate, or similar document (if applicable)"
        accept="image/*,.pdf"
        value={uploadedFiles.business_registration}
        onChange={(file) => onFileUpload('business_registration', file)}
        error={errors.business_registration}
      />
    </div>
  )
}

function LocationStep({ register, watch, errors }: any) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="form-group">
          <label className="form-label">Country *</label>
          <select {...register('location_country', { required: 'Country is required' })} className="form-input">
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
          {errors.location_country && <p className="form-error">{errors.location_country.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">City *</label>
          <input
            {...register('location_city', { required: 'City is required' })}
            className="form-input"
            placeholder="Enter city name"
          />
          {errors.location_city && <p className="form-error">{errors.location_city.message}</p>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Physical Address *</label>
        <input
          {...register('physical_address', { required: 'Physical address is required' })}
          className="form-input"
          placeholder="Street address, area, postal code"
        />
        {errors.physical_address && <p className="form-error">{errors.physical_address.message}</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="form-group">
          <label className="form-label">Property Type</label>
          <select {...register('property_type')} className="form-input">
            <option value="">Select property type</option>
            <option value="house">House</option>
            <option value="apartment">Apartment</option>
            <option value="farm">Farm</option>
            <option value="ranch">Ranch</option>
            <option value="lodge">Lodge</option>
            <option value="community_center">Community Center</option>
            <option value="school">School</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Years Operating</label>
          <input
            {...register('years_operating', { 
              valueAsNumber: true,
              min: 0,
              max: 100
            })}
            className="form-input"
            type="number"
            placeholder="How many years have you been operating?"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Ownership Type</label>
        <select {...register('ownership_type')} className="form-input">
          <option value="">Select ownership type</option>
          <option value="SOLE_PROPRIETOR">Sole Proprietor</option>
          <option value="PARTNERSHIP">Partnership</option>
          <option value="CORPORATION">Corporation</option>
          <option value="NONPROFIT">Nonprofit</option>
          <option value="COMMUNITY">Community Owned</option>
          <option value="GOVERNMENT">Government</option>
        </select>
      </div>
    </div>
  )
}

function AboutStep({ register, watch, errors }: any) {
  return (
    <div className="space-y-6">
      <div className="form-group">
        <label className="form-label">Description *</label>
        <textarea
          {...register('description', { 
            required: 'Description is required',
            minLength: {
              value: 100,
              message: 'Description must be at least 100 characters'
            }
          })}
          className="form-input"
          rows={4}
          placeholder="Describe your organization, what you do, and what makes you unique..."
        />
        {errors.description && <p className="form-error">{errors.description.message}</p>}
      </div>

      <div className="form-group">
        <label className="form-label">Mission Statement</label>
        <textarea
          {...register('mission')}
          className="form-input"
          rows={3}
          placeholder="What is your mission and vision?"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Why do you want to host volunteers? *</label>
        <textarea
          {...register('why_host_volunteers', { 
            required: 'This field is required',
            minLength: {
              value: 50,
              message: 'Please provide at least 50 characters'
            }
          })}
          className="form-input"
          rows={3}
          placeholder="Tell us why you're interested in hosting volunteers and what you hope to achieve..."
        />
        {errors.why_host_volunteers && <p className="form-error">{errors.why_host_volunteers.message}</p>}
      </div>
    </div>
  )
}

function OpportunityStep({ register, watch, errors }: any) {
  return (
    <div className="space-y-6">
      <div className="form-group">
        <label className="form-label">Opportunity Title *</label>
        <input
          {...register('opportunity_title', { required: 'Title is required' })}
          className="form-input"
          placeholder="e.g., Wildlife Conservation Assistant, Community Teacher, Farm Helper"
        />
        {errors.opportunity_title && <p className="form-error">{errors.opportunity_title.message}</p>}
      </div>

      <div className="form-group">
        <label className="form-label">Category *</label>
        <select {...register('category', { required: 'Category is required' })} className="form-input">
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
        {errors.category && <p className="form-error">{errors.category.message}</p>}
      </div>

      <div className="form-group">
        <label className="form-label">Opportunity Description *</label>
        <textarea
          {...register('opportunity_description', { 
            required: 'Description is required',
            minLength: {
              value: 100,
              message: 'Description must be at least 100 characters'
            }
          })}
          className="form-input"
          rows={4}
          placeholder="Describe the opportunity, what volunteers will be doing, and what they can expect..."
        />
        {errors.opportunity_description && <p className="form-error">{errors.opportunity_description.message}</p>}
      </div>

      <div className="form-group">
        <label className="form-label">Tasks & Responsibilities</label>
        <textarea
          {...register('tasks')}
          className="form-input"
          rows={4}
          placeholder="List the main tasks and responsibilities (one per line)"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="form-group">
          <label className="form-label">Duration (weeks) *</label>
          <input
            {...register('duration_weeks', { 
              required: 'Duration is required',
              valueAsNumber: true,
              min: 1,
              max: 52
            })}
            className="form-input"
            type="number"
            placeholder="e.g., 4, 8, 12"
          />
          {errors.duration_weeks && <p className="form-error">{errors.duration_weeks.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Number of Volunteers Needed *</label>
          <input
            {...register('number_of_volunteers', { 
              required: 'Number is required',
              valueAsNumber: true,
              min: 1,
              max: 20
            })}
            className="form-input"
            type="number"
            placeholder="e.g., 1, 2, 5"
          />
          {errors.number_of_volunteers && <p className="form-error">{errors.number_of_volunteers.message}</p>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Required Skills</label>
        <textarea
          {...register('required_skills')}
          className="form-input"
          rows={3}
          placeholder="List any required skills (one per line)"
        />
      </div>
    </div>
  )
}

function BenefitsStep({ register, watch, errors }: any) {
  const accommodation = watch('benefit_accommodation')
  const meals = watch('benefit_meals')
  const internet = watch('benefit_internet')

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-800">
          <strong>Benefits:</strong> Select all benefits you can offer volunteers. 
          Being specific about what you provide helps attract the right volunteers.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-center space-x-3">
          <input
            {...register('benefit_accommodation')}
            type="checkbox"
            className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay"
          />
          <span className="font-medium">Accommodation</span>
        </label>

        {accommodation && (
          <div className="ml-8 space-y-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="form-label">Accommodation Type *</label>
              <select {...register('accommodation_type', { required: 'Required if accommodation offered' })} className="form-input">
                <option value="">Select type</option>
                <option value="private_room">Private Room</option>
                <option value="shared_room">Shared Room</option>
                <option value="private_house">Private House/Apartment</option>
                <option value="shared_house">Shared House</option>
                <option value="tent">Tent/Camping</option>
                <option value="other">Other</option>
              </select>
            </div>

            <label className="flex items-center space-x-3">
              <input
                {...register('bedding_provided')}
                type="checkbox"
                className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay"
              />
              <span>Bedding provided</span>
            </label>
          </div>
        )}

        <label className="flex items-center space-x-3">
          <input
            {...register('benefit_meals')}
            type="checkbox"
            className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay"
          />
          <span className="font-medium">Meals</span>
        </label>

        {meals && (
          <div className="ml-8 space-y-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="form-label">Meals Per Day *</label>
              <select {...register('meals_per_day', { required: 'Required if meals offered' })} className="form-input">
                <option value="">Select number</option>
                <option value="1">1 meal per day</option>
                <option value="2">2 meals per day</option>
                <option value="3">3 meals per day</option>
                <option value="all">All meals included</option>
              </select>
            </div>

            <label className="flex items-center space-x-3">
              <input
                {...register('vegetarian_options')}
                type="checkbox"
                className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay"
              />
              <span>Vegetarian options available</span>
            </label>
          </div>
        )}

        <label className="flex items-center space-x-3">
          <input
            {...register('benefit_laundry')}
            type="checkbox"
            className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay"
          />
          <span className="font-medium">Laundry Facilities</span>
        </label>

        <label className="flex items-center space-x-3">
          <input
            {...register('benefit_internet')}
            type="checkbox"
            className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay"
          />
          <span className="font-medium">Internet Access</span>
        </label>

        {internet && (
          <div className="ml-8 space-y-4 p-4 bg-gray-50 rounded-lg">
            <label className="flex items-center space-x-3">
              <input
                {...register('wifi_available')}
                type="checkbox"
                className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay"
              />
              <span>Wi-Fi available on site</span>
            </label>

            <div>
              <label className="form-label">Internet Reliability</label>
              <select {...register('internet_reliability')} className="form-input">
                <option value="">Select reliability</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="limited">Limited</option>
              </select>
            </div>
          </div>
        )}

        <label className="flex items-center space-x-3">
          <input
            {...register('benefit_transport')}
            type="checkbox"
            className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay"
          />
          <span className="font-medium">Transportation</span>
        </label>

        <label className="flex items-center space-x-3">
          <input
            {...register('benefit_training')}
            type="checkbox"
            className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay"
          />
          <span className="font-medium">Training/Learning Opportunities</span>
        </label>
      </div>

      <div className="form-group">
        <label className="form-label">Additional Benefits</label>
        <textarea
          {...register('additional_benefits')}
          className="form-input"
          rows={3}
          placeholder="Describe any other benefits you offer (e.g., cultural experiences, weekend trips, certificates, etc.)"
        />
      </div>
    </div>
  )
}

function SafetyStep({ register, watch, errors }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          <strong>Safety First:</strong> Volunteer safety is our top priority. Please provide accurate information about safety measures and emergency contacts.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-center space-x-3">
          <input
            {...register('safe_environment', { required: 'This confirmation is required' })}
            type="checkbox"
            className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay"
          />
          <span className="font-medium">I confirm that my location provides a safe and secure environment for volunteers</span>
        </label>
        {errors.safe_environment && <p className="form-error">{errors.safe_environment.message}</p>}
      </div>

      <div className="form-group">
        <label className="form-label">Emergency Contact Name *</label>
        <input
          {...register('emergency_contact_name', { required: 'Emergency contact name is required' })}
          className="form-input"
          placeholder="Name of emergency contact person"
        />
        {errors.emergency_contact_name && <p className="form-error">{errors.emergency_contact_name.message}</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="form-group">
          <label className="form-label">Emergency Contact Phone *</label>
          <input
            {...register('emergency_contact_phone', { required: 'Emergency contact phone is required' })}
            className="form-input"
            placeholder="Emergency contact phone number"
          />
          {errors.emergency_contact_phone && <p className="form-error">{errors.emergency_contact_phone.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Relationship to Emergency Contact</label>
          <input
            {...register('emergency_contact_relationship')}
            className="form-input"
            placeholder="e.g., Family member, Friend, Colleague"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Supervision Details *</label>
        <textarea
          {...register('supervision_details', { 
            required: 'Supervision details are required',
            minLength: {
              value: 50,
              message: 'Please provide detailed supervision information'
            }
          })}
          className="form-input"
          rows={3}
          placeholder="Describe who will supervise volunteers, their qualifications, and how often supervision will be provided..."
        />
        {errors.supervision_details && <p className="form-error">{errors.supervision_details.message}</p>}
      </div>

      <div className="form-group">
        <label className="form-label">House Rules</label>
        <textarea
          {...register('house_rules')}
          className="form-input"
          rows={3}
          placeholder="List any house rules or guidelines volunteers should be aware of (e.g., quiet hours, smoking policy, visitors, etc.)"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Safety Measures</label>
        <textarea
          {...register('safety_measures')}
          className="form-input"
          rows={3}
          placeholder="Describe safety measures in place (e.g., first aid kit, fire extinguisher, security, emergency procedures, etc.)"
        />
      </div>
    </div>
  )
}

function ReferencesStep({ register, watch, errors }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800">
          <strong>Professional References:</strong> Provide at least one professional reference who can vouch for your organization and character.
        </p>
      </div>

      <div className="form-group">
        <label className="form-label">Reference Name *</label>
        <input
          {...register('reference_name', { required: 'Reference name is required' })}
          className="form-input"
          placeholder="Full name of reference person"
        />
        {errors.reference_name && <p className="form-error">{errors.reference_name.message}</p>}
      </div>

      <div className="form-group">
        <label className="form-label">Relationship</label>
        <input
          {...register('reference_relationship')}
          className="form-input"
          placeholder="e.g., Colleague, Client, Community Leader, Partner Organization"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="form-group">
          <label className="form-label">Reference Phone *</label>
          <input
            {...register('reference_phone', { required: 'Reference phone is required' })}
            className="form-input"
            placeholder="Reference phone number"
          />
          {errors.reference_phone && <p className="form-error">{errors.reference_phone.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Reference Email</label>
          <input
            {...register('reference_email', {
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })}
            className="form-input"
            type="email"
            placeholder="reference.email@example.com"
          />
          {errors.reference_email && <p className="form-error">{errors.reference_email.message}</p>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Social Media/Website</label>
        <input
          {...register('reference_social')}
          className="form-input"
          placeholder="LinkedIn profile, website, or other professional social media"
        />
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          <strong>Note:</strong> We may contact your references to verify your application. 
          Please inform them that they might be contacted by the Bokopano team.
        </p>
      </div>
    </div>
  )
}

function DeclarationStep({ register, watch, errors }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">
          <strong>Legal Declaration:</strong> By submitting this application, you confirm that all information provided is accurate and truthful.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-start space-x-3">
          <input
            {...register('declaration_truthful', { required: 'This declaration is required' })}
            type="checkbox"
            className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay mt-1"
          />
          <span className="text-sm">
            I declare that all information provided in this application is true, accurate, and complete to the best of my knowledge.
          </span>
        </label>
        {errors.declaration_truthful && <p className="form-error">{errors.declaration_truthful.message}</p>}
      </div>

      <div className="space-y-4">
        <label className="flex items-start space-x-3">
          <input
            {...register('declaration_benefits', { required: 'This declaration is required' })}
            type="checkbox"
            className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay mt-1"
          />
          <span className="text-sm">
            I commit to providing all benefits and accommodations as described in this application to accepted volunteers.
          </span>
        </label>
        {errors.declaration_benefits && <p className="form-error">{errors.declaration_benefits.message}</p>}
      </div>

      <div className="space-y-4">
        <label className="flex items-start space-x-3">
          <input
            {...register('declaration_rules', { required: 'This declaration is required' })}
            type="checkbox"
            className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay mt-1"
          />
          <span className="text-sm">
            I agree to abide by Bokopano's platform rules, community guidelines, and terms of service.
          </span>
        </label>
        {errors.declaration_rules && <p className="form-error">{errors.declaration_rules.message}</p>}
      </div>

      <div className="space-y-4">
        <label className="flex items-start space-x-3">
          <input
            {...register('declaration_background_check', { required: 'This declaration is required' })}
            type="checkbox"
            className="w-4 h-4 text-clay border-gray-300 rounded focus:ring-clay mt-1"
          />
          <span className="text-sm">
            I understand that Bokopano may conduct background checks and verify the information provided.
          </span>
        </label>
        {errors.declaration_background_check && <p className="form-error">{errors.declaration_background_check.message}</p>}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold mb-2">Important Notes:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>False or misleading information may result in immediate rejection and potential banning from the platform.</li>
          <li>Approved hosts will undergo periodic reviews to ensure continued compliance with platform standards.</li>
          <li>By submitting, you consent to Bokopano sharing your information with potential volunteers for matching purposes.</li>
        </ul>
      </div>

      <div className="form-group">
        <label className="form-label">Full Name (Electronic Signature) *</label>
        <input
          {...register('electronic_signature', { 
            required: 'Electronic signature is required',
            validate: (value) => value === watch('full_name') || 'Signature must match your full name'
          })}
          className="form-input"
          placeholder="Type your full name to sign electronically"
        />
        {errors.electronic_signature && <p className="form-error">{errors.electronic_signature.message}</p>}
      </div>

      <div className="form-group">
        <label className="form-label">Date</label>
        <input
          {...register('signature_date')}
          className="form-input"
          type="date"
          defaultValue={new Date().toISOString().split('T')[0]}
          readOnly
        />
      </div>
    </div>
  )
}
