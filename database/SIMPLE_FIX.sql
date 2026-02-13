-- ============================================
-- SIMPLE FIX - Copy and paste this ENTIRE block
-- Run all at once in Supabase SQL Editor
-- ============================================

-- Create survey_responses table (simple version, no foreign keys yet)
CREATE TABLE IF NOT EXISTS public.survey_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    answers JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_courses table (simple version, no foreign keys yet)
CREATE TABLE IF NOT EXISTS public.user_courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add unique constraint to user_courses
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_courses_user_id_course_id_key'
    ) THEN
        ALTER TABLE public.user_courses ADD CONSTRAINT user_courses_user_id_course_id_key UNIQUE (user_id, course_id);
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_survey_responses_user_id ON public.survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_user_id ON public.user_courses(user_id);

-- Enable RLS
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop first if they exist)
DROP POLICY IF EXISTS "Users can view their own survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can insert their own survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can view their own enrolled courses" ON public.user_courses;
DROP POLICY IF EXISTS "Users can enroll themselves in courses" ON public.user_courses;

-- Create policies
CREATE POLICY "Users can view their own survey responses" 
ON public.survey_responses FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own survey responses" 
ON public.survey_responses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own enrolled courses" 
ON public.user_courses FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll themselves in courses" 
ON public.user_courses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create or update profiles for all users
INSERT INTO profiles (id, xp, gems, hearts, max_hearts)
SELECT 
    u.id,
    250 as xp,
    120 as gems,
    8 as hearts,
    10 as max_hearts
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO UPDATE SET
    xp = COALESCE(profiles.xp, 250),
    gems = COALESCE(profiles.gems, 120),
    hearts = COALESCE(profiles.hearts, 8),
    max_hearts = COALESCE(profiles.max_hearts, 10);

-- Verify everything
SELECT 'Tables created successfully!' as status;

-- Show your profile
SELECT 
    u.email,
    p.xp,
    p.gems,
    p.hearts,
    p.max_hearts
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
LIMIT 1;
