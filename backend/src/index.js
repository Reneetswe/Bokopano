const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const dotenv = require('dotenv')
const { createClient } = require('@supabase/supabase-js')

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet())
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080', 'https://bokopano.vercel.app'],
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
app.use(limiter)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''
).trim()

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
)

// Helper function to handle errors
const handleError = (res, error, statusCode = 500) => {
  console.error('API Error:', error)
  res.status(statusCode).json({
    error: error.message || 'Internal server error',
    timestamp: new Date().toISOString()
  })
}

const ensureSupabaseConfig = (res) => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    res.status(500).json({
      error: 'Server configuration error: Supabase credentials are missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).',
      timestamp: new Date().toISOString()
    })
    return false
  }

  return true
}

// Helper function to validate user authentication
const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    req.user = user
    next()
  } catch (error) {
    handleError(res, error, 401)
  }
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    if (!ensureSupabaseConfig(res)) return

    const { email, password, full_name, country, account_type } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://bokopano.vercel.app/host-registration.html',
        data: {
          full_name,
          country,
          account_type: account_type || 'volunteer'
        }
      }
    })

    if (error) throw error

    res.status(201).json({ 
      user: data.user,
      session: data.session,
      message: 'Account created successfully'
    })
  } catch (error) {
    handleError(res, error, 400)
  }
})

app.post('/api/auth/signin', async (req, res) => {
  try {
    if (!ensureSupabaseConfig(res)) return

    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    res.json({ 
      user: data.user,
      session: data.session,
      token: data.session.access_token
    })
  } catch (error) {
    handleError(res, error, 401)
  }
})

// Host routes
app.get('/api/hosts', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hosts')
      .select(`
        *,
        host_profiles(*),
        host_verification(*),
        host_opportunities(*)
      `)
      .eq('user_id', req.user.id)
      .single()

    if (error) throw error

    res.json({ data })
  } catch (error) {
    handleError(res, error)
  }
})

app.post('/api/hosts', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hosts')
      .insert({ user_id: req.user.id })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ data })
  } catch (error) {
    handleError(res, error)
  }
})

app.put('/api/hosts/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Verify user owns this host record
    const { data: host, error: verifyError } = await supabase
      .from('hosts')
      .select('user_id')
      .eq('id', id)
      .single()

    if (verifyError) throw verifyError
    if (host.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const { data, error } = await supabase
      .from('hosts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ data })
  } catch (error) {
    handleError(res, error)
  }
})

// Host profile routes
app.post('/api/host-profiles', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('host_profiles')
      .insert(req.body)
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ data })
  } catch (error) {
    handleError(res, error)
  }
})

app.put('/api/host-profiles/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Verify user owns this profile
    const { data: profile, error: verifyError } = await supabase
      .from('host_profiles')
      .select(`
        host_id,
        hosts!inner(user_id)
      `)
      .eq('id', id)
      .single()

    if (verifyError) throw verifyError
    if (profile.hosts.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const { data, error } = await supabase
      .from('host_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ data })
  } catch (error) {
    handleError(res, error)
  }
})

// Host verification routes
app.post('/api/host-verification', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('host_verification')
      .insert(req.body)
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ data })
  } catch (error) {
    handleError(res, error)
  }
})

app.put('/api/host-verification/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Verify user owns this verification record
    const { data: verification, error: verifyError } = await supabase
      .from('host_verification')
      .select(`
        host_id,
        hosts!inner(user_id)
      `)
      .eq('id', id)
      .single()

    if (verifyError) throw verifyError
    if (verification.hosts.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const { data, error } = await supabase
      .from('host_verification')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ data })
  } catch (error) {
    handleError(res, error)
  }
})

// Host opportunities routes
app.get('/api/host-opportunities', authenticateUser, async (req, res) => {
  try {
    const { hostId } = req.query

    let query = supabase
      .from('host_opportunities')
      .select('*')
      .order('created_at', { ascending: false })

    if (hostId) {
      query = query.eq('host_id', hostId)
    } else {
      // If no hostId, get opportunities for the authenticated user
      const { data: host } = await supabase
        .from('hosts')
        .select('id')
        .eq('user_id', req.user.id)
        .single()

      if (host) {
        query = query.eq('host_id', host.id)
      }
    }

    const { data, error } = await query

    if (error) throw error

    res.json({ data })
  } catch (error) {
    handleError(res, error)
  }
})

app.post('/api/host-opportunities', authenticateUser, async (req, res) => {
  try {
    // Verify user is an approved host
    const { data: host, error: hostError } = await supabase
      .from('hosts')
      .select('id, status')
      .eq('user_id', req.user.id)
      .single()

    if (hostError) throw hostError
    if (host.status !== 'APPROVED') {
      return res.status(403).json({ 
        error: 'Only approved hosts can create opportunities' 
      })
    }

    const opportunityData = {
      ...req.body,
      host_id: host.id
    }

    const { data, error } = await supabase
      .from('host_opportunities')
      .insert(opportunityData)
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ data })
  } catch (error) {
    handleError(res, error)
  }
})

app.put('/api/host-opportunities/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Verify user owns this opportunity
    const { data: opportunity, error: verifyError } = await supabase
      .from('host_opportunities')
      .select(`
        host_id,
        hosts!inner(user_id)
      `)
      .eq('id', id)
      .single()

    if (verifyError) throw verifyError
    if (opportunity.hosts.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const { data, error } = await supabase
      .from('host_opportunities')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ data })
  } catch (error) {
    handleError(res, error)
  }
})

// Public opportunities (for volunteers)
app.get('/api/opportunities', async (req, res) => {
  try {
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

    if (error) throw error

    res.json({ data })
  } catch (error) {
    handleError(res, error)
  }
})

// Host applications routes
app.get('/api/host-applications', authenticateUser, async (req, res) => {
  try {
    const { opportunityId } = req.query

    let query = supabase
      .from('host_applications')
      .select(`
        *,
        user_id,
        profiles(
          full_name,
          email,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })

    if (opportunityId) {
      query = query.eq('opportunity_id', opportunityId)
    } else {
      // Get applications for user's opportunities
      const { data: host } = await supabase
        .from('hosts')
        .select('id')
        .eq('user_id', req.user.id)
        .single()

      if (host) {
        const opportunityIds = await supabase
          .from('host_opportunities')
          .select('id')
          .eq('host_id', host.id)

        if (opportunityIds.data) {
          const ids = opportunityIds.data.map(op => op.id)
          query = query.in('opportunity_id', ids)
        }
      }
    }

    const { data, error } = await query

    if (error) throw error

    res.json({ data })
  } catch (error) {
    handleError(res, error)
  }
})

app.post('/api/host-applications', authenticateUser, async (req, res) => {
  try {
    const applicationData = {
      ...req.body,
      user_id: req.user.id
    }

    const { data, error } = await supabase
      .from('host_applications')
      .insert(applicationData)
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ data })
  } catch (error) {
    handleError(res, error)
  }
})

// File upload route (for verification documents)
app.post('/api/upload-verification', authenticateUser, async (req, res) => {
  try {
    const { file, documentType } = req.body

    if (!file || !documentType) {
      return res.status(400).json({ error: 'File and document type are required' })
    }

    // Upload to Supabase Storage
    const fileName = `${req.user.id}/${documentType}_${Date.now()}.jpg`
    
    const { data, error } = await supabase.storage
      .from('verification-documents')
      .upload(fileName, Buffer.from(file, 'base64'), {
        contentType: 'image/jpeg'
      })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('verification-documents')
      .getPublicUrl(fileName)

    res.json({ url: publicUrl })
  } catch (error) {
    handleError(res, error)
  }
})

// Admin routes (for reviewing applications)
app.get('/api/admin/hosts', authenticateUser, async (req, res) => {
  try {
    // TODO: Add admin role check
    const { data, error } = await supabase
      .from('hosts')
      .select(`
        *,
        host_profiles(*),
        host_verification(*),
        profiles(
          full_name,
          email
        )
      `)
      .in('status', ['SUBMITTED', 'UNDER_REVIEW'])
      .order('created_at', { ascending: false })

    if (error) throw error

    res.json({ data })
  } catch (error) {
    handleError(res, error)
  }
})

app.put('/api/admin/hosts/:id/review', authenticateUser, async (req, res) => {
  try {
    // TODO: Add admin role check
    const { id } = req.params
    const { status, adminNotes, rejectionReason } = req.body

    const updates = {
      status,
      admin_notes: adminNotes,
      rejection_reason: rejectionReason,
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('hosts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ data })
  } catch (error) {
    handleError(res, error)
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  handleError(res, err)
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Start server
app.listen(PORT, () => {
  console.log(`Bokopano API server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
})

module.exports = app
