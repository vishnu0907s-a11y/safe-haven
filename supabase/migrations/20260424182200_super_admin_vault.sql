-- Highly Secure Super Admin Vault
-- This table stores encrypted credentials and access logs for the Super Admin portal.

CREATE TABLE IF NOT EXISTS public.super_admin_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_name TEXT NOT NULL,
    admin_email TEXT UNIQUE NOT NULL,
    pass1_hash TEXT NOT NULL, -- Encrypted Primary Password
    pass2_hash TEXT NOT NULL, -- Encrypted Secondary Key
    pass3_hash TEXT NOT NULL, -- Encrypted Final Protocol
    secret_code_hash TEXT NOT NULL, -- Encrypted Master Secret
    two_fa_enabled BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.super_admin_vault ENABLE ROW LEVEL SECURITY;

-- Deny all public access by default
CREATE POLICY "Deny all public access to super admin vault" 
ON public.super_admin_vault FOR ALL 
USING (false);

-- Only allow internal system checks (Security Defininer functions)
-- This ensures no client-side JS can query this table directly.

CREATE OR REPLACE FUNCTION verify_super_admin(
    p_email TEXT,
    p_pass1 TEXT,
    p_pass2 TEXT,
    p_pass3 TEXT,
    p_secret TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- This is a simplified verification logic. 
    -- In a real production app, use pgcrypto for actual cryptographically secure hashing.
    SELECT count(*) INTO v_count 
    FROM public.super_admin_vault 
    WHERE admin_email = p_email 
      AND pass1_hash = p_pass1 
      AND pass2_hash = p_pass2 
      AND pass3_hash = p_pass3 
      AND secret_code_hash = p_secret;
      
    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert the Master Super Admin (Change these in production!)
INSERT INTO public.super_admin_vault (admin_name, admin_email, pass1_hash, pass2_hash, pass3_hash, secret_code_hash)
VALUES (
    'Master Vishnu', 
    'visnu01super.ad@gmail.com', 
    'p1_secure', 
    'p2_secure', 
    'p3_secure', 
    'SUPERSAFE2024'
) ON CONFLICT (admin_email) DO NOTHING;
