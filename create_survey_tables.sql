-- ============================================
-- CREATE SURVEY_RESPONSES TABLE
-- Run this in Supabase SQL Editor FIRST
-- ============================================

-- Create survey_responses table
CREATE TABLE IF NOT EXISTS public.survey_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    answers JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_survey_responses_user_id ON public.survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_course_id ON public.survey_responses(course_id);

-- Enable RLS
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own survey responses" 
ON public.survey_responses FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own survey responses" 
ON public.survey_responses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create user_courses table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, course_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_courses_user_id ON public.user_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_course_id ON public.user_courses(course_id);

-- Enable RLS
ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own enrolled courses" 
ON public.user_courses FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll themselves in courses" 
ON public.user_courses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Verify tables were created
SELECT 'survey_responses table created' as status 
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'survey_responses');

SELECT 'user_courses table created' as status 
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_courses');
