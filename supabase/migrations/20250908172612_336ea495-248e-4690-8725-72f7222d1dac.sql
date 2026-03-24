-- Grant admin privileges to matt@chatdiy.ai
INSERT INTO public.user_roles (user_id, role)
SELECT 
  au.id,
  'admin'::app_role
FROM auth.users au
WHERE au.email = 'matt@chatdiy.ai'
ON CONFLICT (user_id, role) DO NOTHING;