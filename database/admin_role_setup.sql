-- ============================================
-- ADMIN ROLE AND PERMISSIONS SETUP
-- ============================================

-- 1. Add 'role' column to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user';
    END IF;
END $$;

-- 2. Protect Courses Table using RLS
-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view courses
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;
CREATE POLICY "Anyone can view courses" 
ON public.courses FOR SELECT 
USING (true);

-- Allow ONLY ADMINS to Insert, Update, Delete courses
DROP POLICY IF EXISTS "Only admins can insert courses" ON public.courses;
CREATE POLICY "Only admins can insert courses" 
ON public.courses FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Only admins can update courses" ON public.courses;
CREATE POLICY "Only admins can update courses" 
ON public.courses FOR UPDATE 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Only admins can delete courses" ON public.courses;
CREATE POLICY "Only admins can delete courses" 
ON public.courses FOR DELETE 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================
-- INSTRUCTIONS TO MAKE A USER AN ADMIN
-- ============================================
-- Uncomment and run the code below with your actual email address
-- UPDATE public.profiles 
-- SET role = 'admin' 
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@EXAMPLE.COM');
