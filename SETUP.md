# Bokopano Host Application + Verification System - Setup Guide

## Overview

This document provides step-by-step instructions for setting up the Bokopano Host Application + Verification System. The system includes a comprehensive multi-step host application process, document verification, and approval workflow.

## Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Git for version control

## Project Structure

```
bokopano/
|-- client/                 # Next.js frontend
|   |-- src/
|   |   |-- app/           # App router pages
|   |   |-- components/    # React components
|   |   |-- contexts/      # React contexts
|   |   |-- lib/           # Utilities and Supabase client
|   |   |-- types/         # TypeScript types
|   |-- package.json
|   |-- next.config.js
|   |-- tailwind.config.js
|-- backend/               # Express API server
|   |-- src/
|   |   |-- index.js       # Main server file
|   |-- package.json
|-- database/              # Database schemas
|   |-- schema.sql         # Supabase database schema
|-- package.json           # Root package.json (for running both)
|-- README.md
|-- SETUP.md               # This file
```

## Step 1: Database Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key
3. Go to Settings > API and copy the service role key (needed for backend)

### 1.2 Run Database Schema

1. In your Supabase project, go to the SQL Editor
2. Copy and paste the contents of `database/schema.sql`
3. Run the SQL script to create all tables, enums, indexes, and RLS policies

### 1.3 Set Up Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `verification-documents`
3. Set public access to **OFF** (important for security)
4. The RLS policies in the schema will handle permissions automatically

## Step 2: Environment Configuration

### 2.1 Frontend Environment

Create `client/.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/pdf,application/pdf
```

### 2.2 Backend Environment

Create `backend/.env`:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=5000
NODE_ENV=development

# Email Configuration (optional, for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Security
JWT_SECRET=your_jwt_secret_here
CORS_ORIGIN=http://localhost:3000
```

## Step 3: Installation and Setup

### 3.1 Install Dependencies

Run from the project root:

```bash
# Install root dependencies
npm install

# Install all dependencies at once
npm run install:all
```

Or manually:

```bash
# Frontend dependencies
cd client
npm install

# Backend dependencies
cd ../backend
npm install
```

### 3.2 Update Package Dependencies

Add missing dependencies to `client/package.json`:

```json
{
  "dependencies": {
    "@heroicons/react": "^2.0.18",
    "react-hook-form": "^7.48.2",
    "react-dropzone": "^14.2.3",
    "lucide-react": "^0.294.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

Run `npm install` in the client directory.

## Step 4: Running the Application

### 4.1 Development Mode

From the project root:

```bash
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### 4.2 Individual Services

Frontend only:
```bash
cd client
npm run dev
```

Backend only:
```bash
cd backend
npm run dev
```

## Step 5: Testing the System

### 5.1 Create Test Account

1. Navigate to http://localhost:3000
2. Click "Become a Host" or "Sign In"
3. Create a new account using email/password

### 5.2 Complete Host Application

1. After signing in, you'll be redirected to the host application
2. Complete all 9 steps:
   - **Step 1**: Identity information
   - **Step 2**: Upload verification documents
   - **Step 3**: Location details
   - **Step 4**: About your organization
   - **Step 5**: Opportunity setup
   - **Step 6**: Benefits offered
   - **Step 7**: Safety information
   - **Step 8**: References
   - **Step 9**: Declaration and signature

### 5.3 Admin Review (Manual)

Since this is an MVP, admin review is done manually:

1. Go to your Supabase dashboard
2. In the SQL Editor, run:
   ```sql
   UPDATE hosts 
   SET status = 'APPROVED' 
   WHERE user_id = 'your_user_id';
   ```

### 5.4 Test Host Dashboard

1. After approval, navigate to /host/dashboard
2. You should see:
   - Approved status badge
   - Profile completion percentage
   - Ability to create opportunities
   - Quick action buttons

## Step 6: Key Features Testing

### 6.1 Multi-Step Form
- Test navigation between steps
- Test form validation
- Test file uploads (drag & drop)
- Test progress indicator

### 6.2 Status Management
- Test different host statuses
- Test access control (unapproved hosts can't create opportunities)
- Test dashboard for different statuses

### 6.3 File Uploads
- Test uploading ID documents
- Test file validation (size, type)
- Test file preview functionality

## Step 7: Production Deployment

### 7.1 Frontend (Vercel recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### 7.2 Backend (Railway/Render recommended)

1. Push code to GitHub  
2. Connect repository to Railway/Render
3. Set environment variables
4. Deploy

### 7.3 Production Environment Variables

Update CORS origins and URLs for production:

```bash
# Frontend
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_API_URL=https://your-backend-url.com

# Backend
CORS_ORIGIN=https://your-frontend-url.com
NODE_ENV=production
```

## Step 8: Security Considerations

### 8.1 Row Level Security (RLS)

The database schema includes comprehensive RLS policies. Ensure:
- Storage bucket policies are correctly configured
- Table policies restrict access to user's own data
- Admin-only operations are properly secured

### 8.2 File Upload Security

- File size limits are enforced (10MB max)
- File type restrictions are in place
- Storage bucket is private (no public access)
- Files are organized by user ID for isolation

### 8.3 API Security

- Authentication required for all protected routes
- Rate limiting implemented
- CORS properly configured
- Input validation on all endpoints

## Step 9: Monitoring and Maintenance

### 9.1 Health Checks

- Backend health endpoint: `/health`
- Monitor database performance
- Check storage usage

### 9.2 Common Issues

**Upload failures**: Check storage policies and file size limits
**Auth issues**: Verify Supabase keys and CORS settings
**Database errors**: Check RLS policies and table permissions

## Step 10: Next Steps

### 10.1 Admin Dashboard

Build an admin interface for:
- Reviewing host applications
- Managing host statuses
- Viewing verification documents
- Bulk operations

### 10.2 Email Notifications

Implement email notifications for:
- Application received
- Application approved/rejected
- New volunteer applications
- System alerts

### 10.3 Enhanced Features

- Real-time notifications
- Advanced search and filtering
- Reviews and ratings system
- Payment processing
- Mobile app

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase documentation
3. Check browser console for errors
4. Verify environment variables are correctly set

---

**Important**: This is an MVP system focused on core functionality. Production use should include additional security measures, testing, and monitoring.
