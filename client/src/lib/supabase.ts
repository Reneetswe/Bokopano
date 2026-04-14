import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Auth helper functions
export const signUp = async (email: string, password: string, metadata?: any) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  })
  return { data, error }
}

export const createHostReference = async (referenceData: any) => {
  const { data, error } = await supabase
    .from('host_references')
    .insert(referenceData)
    .select()
    .single()

  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// Host-related functions
export const createHost = async (userId: string) => {
  const { data, error } = await supabase
    .from('hosts')
    .insert({ user_id: userId, status: 'DRAFT' })
    .select()
    .single()
  
  return { data, error }
}

export const getHostByUserId = async (userId: string) => {
  const { data, error } = await supabase
    .from('hosts')
    .select(`
      *,
      host_profiles(*),
      host_verification(*),
      host_opportunities(*)
    `)
    .eq('user_id', userId)
    .single()
  
  return { data, error }
}

export const updateHost = async (hostId: string, updates: any) => {
  const { data, error } = await supabase
    .from('hosts')
    .update(updates)
    .eq('id', hostId)
    .select()
    .single()
  
  return { data, error }
}

export const createHostProfile = async (profileData: any) => {
  const { data, error } = await supabase
    .from('host_profiles')
    .insert(profileData)
    .select()
    .single()
  
  return { data, error }
}

export const updateHostProfile = async (profileId: string, updates: any) => {
  const { data, error } = await supabase
    .from('host_profiles')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single()
  
  return { data, error }
}

export const createHostVerification = async (verificationData: any) => {
  const { data, error } = await supabase
    .from('host_verification')
    .insert(verificationData)
    .select()
    .single()
  
  return { data, error }
}

export const updateHostVerification = async (verificationId: string, updates: any) => {
  const { data, error } = await supabase
    .from('host_verification')
    .update(updates)
    .eq('id', verificationId)
    .select()
    .single()
  
  return { data, error }
}

export const createHostOpportunity = async (opportunityData: any) => {
  const { data, error } = await supabase
    .from('host_opportunities')
    .insert(opportunityData)
    .select()
    .single()
  
  return { data, error }
}

export const getHostOpportunities = async (hostId: string) => {
  const { data, error } = await supabase
    .from('host_opportunities')
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false })
  
  return { data, error }
}

// File upload functions
export const uploadVerificationDocument = async (
  userId: string, 
  file: File, 
  documentType: string
) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${documentType}_${Date.now()}.${fileExt}`
  
  const { data, error } = await supabase.storage
    .from('verification-documents')
    .upload(fileName, file)
  
  if (error) return { data: null, error }
  
  const { data: { publicUrl } } = supabase.storage
    .from('verification-documents')
    .getPublicUrl(fileName)
  
  return { data: { url: publicUrl }, error: null }
}

// Get public opportunities (for volunteers)
export const getPublicOpportunities = async () => {
  const { data, error } = await supabase
    .from('host_opportunities')
    .select(`
      *,
      hosts!inner(
        status,
        host_profiles(
          organization_name,
          location_city,
          location_country
        )
      )
    `)
    .eq('hosts.status', 'APPROVED')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  
  return { data, error }
}
