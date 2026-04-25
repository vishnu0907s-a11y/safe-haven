-- Update or Insert the Super Admin with specific credentials provided by the user
INSERT INTO public.super_admin_vault (
    admin_name, 
    admin_email, 
    pass1_hash, 
    pass2_hash, 
    pass3_hash, 
    secret_code_hash
)
VALUES (
    'vishnu~', 
    'visnu01super.ad@gmail.com', 
    'DRAKOOAV9655@~', 
    'vishnu0907s@~', 
    'resQher01@~', 
    'SUPERADMINSAFEE@2026@~'
)
ON CONFLICT (admin_email) DO UPDATE SET
    admin_name = EXCLUDED.admin_name,
    pass1_hash = EXCLUDED.pass1_hash,
    pass2_hash = EXCLUDED.pass2_hash,
    pass3_hash = EXCLUDED.pass3_hash,
    secret_code_hash = EXCLUDED.secret_code_hash;
