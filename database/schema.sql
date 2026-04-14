-- Bokopano Host Application + Verification System Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create host status enum
CREATE TYPE host_status AS ENUM (
    'DRAFT',
    'SUBMITTED', 
    'UNDER_REVIEW',
    'NEEDS_INFO',
    'APPROVED',
    'REJECTED',
    'SUSPENDED'
);

-- Create host type enum
CREATE TYPE host_type AS ENUM (
    'INDIVIDUAL',
    'NONPROFIT',
    'BUSINESS',
    'COMMUNITY',
    'GOVERNMENT',
    'SCHOOL'
);

-- Create ownership type enum
CREATE TYPE ownership_type AS ENUM (
    'SOLE_PROPRIETOR',
    'PARTNERSHIP', 
    'CORPORATION',
    'NONPROFIT',
    'COMMUNITY',
    'GOVERNMENT'
);

-- Create opportunity category enum
CREATE TYPE opportunity_category AS ENUM (
    'CONSERVATION',
    'EDUCATION',
    'COMMUNITY',
    'AGRICULTURE',
    'HEALTHCARE',
    'ARTS_CULTURE',
    'TECHNOLOGY',
    'TOURISM',
    'CONSTRUCTION',
    'SOCIAL_WORK'
);

-- Create benefit type enum
CREATE TYPE benefit_type AS ENUM (
    'ACCOMMODATION',
    'MEALS',
    'LAUNDRY',
    'INTERNET',
    'TRANSPORT',
    'TRAINING',
    'STIPEND',
    'EXPERIENCE_CERTIFICATE'
);

-- Hosts table
CREATE TABLE hosts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status host_status DEFAULT 'DRAFT',
    completion_percentage INTEGER DEFAULT 0,
    admin_notes TEXT,
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Host Profiles table
CREATE TABLE host_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    host_id UUID REFERENCES hosts(id) ON DELETE CASCADE,
    organization_name TEXT,
    host_type host_type,
    role_in_org TEXT,
    description TEXT,
    mission TEXT,
    location_country TEXT,
    location_city TEXT,
    physical_address TEXT,
    gps_lat DECIMAL(10, 8),
    gps_lng DECIMAL(11, 8),
    years_operating INTEGER,
    ownership_type ownership_type,
    website TEXT,
    social_links JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Host Verification table
CREATE TABLE host_verification (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    host_id UUID REFERENCES hosts(id) ON DELETE CASCADE,
    id_document_url TEXT,
    selfie_verification_url TEXT,
    proof_of_address_url TEXT,
    business_registration_url TEXT,
    verification_notes TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_method TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Host Opportunities table
CREATE TABLE host_opportunities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    host_id UUID REFERENCES hosts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category opportunity_category,
    tasks TEXT[],
    duration_weeks INTEGER,
    benefits JSONB, -- JSON object with benefit details
    required_skills TEXT[],
    number_of_volunteers INTEGER,
    status TEXT DEFAULT 'active', -- active/inactive
    application_deadline TIMESTAMP WITH TIME ZONE,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Host Applications table (for volunteers applying)
CREATE TABLE host_applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    opportunity_id UUID REFERENCES host_opportunities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending/accepted/rejected/withdrawn
    cover_letter TEXT,
    availability TEXT,
    skills_offered TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Host References table
CREATE TABLE host_references (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    host_id UUID REFERENCES hosts(id) ON DELETE CASCADE,
    reference_name TEXT NOT NULL,
    relationship TEXT,
    phone TEXT,
    email TEXT,
    social_links JSONB,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_hosts_user_id ON hosts(user_id);
CREATE INDEX idx_hosts_status ON hosts(status);
CREATE INDEX idx_host_profiles_host_id ON host_profiles(host_id);
CREATE INDEX idx_host_verification_host_id ON host_verification(host_id);
CREATE INDEX idx_host_opportunities_host_id ON host_opportunities(host_id);
CREATE INDEX idx_host_opportunities_status ON host_opportunities(status);
CREATE INDEX idx_host_applications_opportunity_id ON host_applications(opportunity_id);
CREATE INDEX idx_host_applications_user_id ON host_applications(user_id);

-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-documents', 'verification-documents', false);

-- Set up Row Level Security (RLS)
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_references ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hosts table
CREATE POLICY "Users can view their own host status"
    ON hosts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own host record"
    ON hosts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own host record"
    ON hosts FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for host_profiles table
CREATE POLICY "Users can view their own host profile"
    ON host_profiles FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM hosts 
        WHERE hosts.id = host_profiles.host_id 
        AND hosts.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own host profile"
    ON host_profiles FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM hosts 
        WHERE hosts.id = host_profiles.host_id 
        AND hosts.user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own host profile"
    ON host_profiles FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM hosts 
        WHERE hosts.id = host_profiles.host_id 
        AND hosts.user_id = auth.uid()
    ));

-- RLS Policies for host_verification table
CREATE POLICY "Users can view their own verification"
    ON host_verification FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM hosts 
        WHERE hosts.id = host_verification.host_id 
        AND hosts.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own verification"
    ON host_verification FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM hosts 
        WHERE hosts.id = host_verification.host_id 
        AND hosts.user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own verification"
    ON host_verification FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM hosts 
        WHERE hosts.id = host_verification.host_id 
        AND hosts.user_id = auth.uid()
    ));

-- RLS Policies for host_opportunities table
CREATE POLICY "Users can view approved host opportunities"
    ON host_opportunities FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM hosts 
        WHERE hosts.id = host_opportunities.host_id 
        AND (hosts.user_id = auth.uid() OR hosts.status = 'APPROVED')
    ));

CREATE POLICY "Approved hosts can create opportunities"
    ON host_opportunities FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM hosts 
        WHERE hosts.id = host_opportunities.host_id 
        AND hosts.user_id = auth.uid()
        AND hosts.status = 'APPROVED'
    ));

CREATE POLICY "Hosts can update their own opportunities"
    ON host_opportunities FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM hosts 
        WHERE hosts.id = host_opportunities.host_id 
        AND hosts.user_id = auth.uid()
    ));

-- Storage policies for verification documents
CREATE POLICY "Users can upload their own verification documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'verification-documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own verification documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'verification-documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Create function to update completion percentage
CREATE OR REPLACE FUNCTION update_host_completion_percentage()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate completion percentage based on required fields
    NEW.completion_percentage = 
        CASE 
            WHEN NEW.status = 'DRAFT' THEN
                (
                    -- Check if profile exists and has required fields
                    (SELECT CASE WHEN COUNT(*) > 0 AND 
                        organization_name IS NOT NULL AND 
                        description IS NOT NULL AND 
                        location_country IS NOT NULL AND 
                        physical_address IS NOT NULL 
                        THEN 30 ELSE 0 END 
                    FROM host_profiles WHERE host_id = NEW.id) +
                    
                    -- Check if verification exists and has documents
                    (SELECT CASE WHEN COUNT(*) > 0 AND 
                        id_document_url IS NOT NULL AND 
                        proof_of_address_url IS NOT NULL 
                        THEN 40 ELSE 0 END 
                    FROM host_verification WHERE host_id = NEW.id) +
                    
                    -- Check if opportunities exist
                    (SELECT CASE WHEN COUNT(*) > 0 THEN 30 ELSE 0 END 
                    FROM host_opportunities WHERE host_id = NEW.id)
                )
            ELSE NEW.completion_percentage
        END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update completion percentage
CREATE TRIGGER update_host_completion_trigger
    BEFORE INSERT OR UPDATE ON hosts
    FOR EACH ROW
    EXECUTE FUNCTION update_host_completion_percentage();

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_hosts_updated_at
    BEFORE UPDATE ON hosts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_host_profiles_updated_at
    BEFORE UPDATE ON host_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_host_verification_updated_at
    BEFORE UPDATE ON host_verification
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_host_opportunities_updated_at
    BEFORE UPDATE ON host_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_host_applications_updated_at
    BEFORE UPDATE ON host_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
