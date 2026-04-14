export type Database = {
  public: {
    Tables: {
      hosts: {
        Row: {
          id: string
          user_id: string
          status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'NEEDS_INFO' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
          completion_percentage: number
          admin_notes: string | null
          rejection_reason: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['hosts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['hosts']['Insert']>
      }
      host_profiles: {
        Row: {
          id: string
          host_id: string
          organization_name: string | null
          host_type: 'INDIVIDUAL' | 'NONPROFIT' | 'BUSINESS' | 'COMMUNITY' | 'GOVERNMENT' | 'SCHOOL' | null
          role_in_org: string | null
          description: string | null
          mission: string | null
          location_country: string | null
          location_city: string | null
          physical_address: string | null
          gps_lat: number | null
          gps_lng: number | null
          years_operating: number | null
          ownership_type: 'SOLE_PROPRIETOR' | 'PARTNERSHIP' | 'CORPORATION' | 'NONPROFIT' | 'COMMUNITY' | 'GOVERNMENT' | null
          website: string | null
          social_links: Record<string, any> | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['host_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['host_profiles']['Insert']>
      }
      host_verification: {
        Row: {
          id: string
          host_id: string
          id_document_url: string | null
          selfie_verification_url: string | null
          proof_of_address_url: string | null
          business_registration_url: string | null
          verification_notes: string | null
          is_verified: boolean
          verification_method: string | null
          verified_at: string | null
          verified_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['host_verification']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['host_verification']['Insert']>
      }
      host_opportunities: {
        Row: {
          id: string
          host_id: string
          title: string
          description: string
          category: 'CONSERVATION' | 'EDUCATION' | 'COMMUNITY' | 'AGRICULTURE' | 'HEALTHCARE' | 'ARTS_CULTURE' | 'TECHNOLOGY' | 'TOURISM' | 'CONSTRUCTION' | 'SOCIAL_WORK' | null
          tasks: string[] | null
          duration_weeks: number | null
          benefits: Record<string, any> | null
          required_skills: string[] | null
          number_of_volunteers: number | null
          status: string
          application_deadline: string | null
          start_date: string | null
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['host_opportunities']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['host_opportunities']['Insert']>
      }
      host_applications: {
        Row: {
          id: string
          opportunity_id: string
          user_id: string
          status: string
          cover_letter: string | null
          availability: string | null
          skills_offered: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['host_applications']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['host_applications']['Insert']>
      }
      host_references: {
        Row: {
          id: string
          host_id: string
          reference_name: string
          relationship: string | null
          phone: string | null
          email: string | null
          social_links: Record<string, any> | null
          verified: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['host_references']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['host_references']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      host_status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'NEEDS_INFO' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
      host_type: 'INDIVIDUAL' | 'NONPROFIT' | 'BUSINESS' | 'COMMUNITY' | 'GOVERNMENT' | 'SCHOOL'
      ownership_type: 'SOLE_PROPRIETOR' | 'PARTNERSHIP' | 'CORPORATION' | 'NONPROFIT' | 'COMMUNITY' | 'GOVERNMENT'
      opportunity_category: 'CONSERVATION' | 'EDUCATION' | 'COMMUNITY' | 'AGRICULTURE' | 'HEALTHCARE' | 'ARTS_CULTURE' | 'TECHNOLOGY' | 'TOURISM' | 'CONSTRUCTION' | 'SOCIAL_WORK'
      benefit_type: 'ACCOMMODATION' | 'MEALS' | 'LAUNDRY' | 'INTERNET' | 'TRANSPORT' | 'TRAINING' | 'STIPEND' | 'EXPERIENCE_CERTIFICATE'
    }
  }
}
