-- ============================================
-- STEP-BY-STEP FIX - Run each section separately
-- ============================================

-- ============================================
-- STEP 1: Create survey_responses table
-- Copy and run this section FIRST
-- ============================================

CREATE TABLE IF NOT EXISTS public.survey_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    answers JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- STEP 2: Create user_courses table
-- Copy and run this section SECOND
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, course_id)
);

-- ============================================
-- STEP 3: Add foreign key constraints
-- Copy and run this section THIRD
-- ============================================

-- Add foreign keys to survey_responses (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'survey_responses') THEN
        -- Add foreign key for user_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'survey_responses_user_id_fkey'
        ) THEN
            ALTER TABLE public.survey_responses 
            ADD CONSTRAINT survey_responses_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        -- Add foreign key for course_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'survey_responses_course_id_fkey'
        ) THEN
            ALTER TABLE public.survey_responses 
            ADD CONSTRAINT survey_responses_course_id_fkey 
            FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Add foreign keys to user_courses (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_courses') THEN
        -- Add foreign key for user_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_courses_user_id_fkey'
        ) THEN
            ALTER TABLE public.user_courses 
            ADD CONSTRAINT user_courses_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        -- Add foreign key for course_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_courses_course_id_fkey'
        ) THEN
            ALTER TABLE public.user_courses 
            ADD CONSTRAINT user_courses_course_id_fkey 
            FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- ============================================
-- STEP 4: Create indexes
-- Copy and run this section FOURTH
-- ============================================

CREATE INDEX IF NOT EXISTS idx_survey_responses_user_id ON public.survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_course_id ON public.survey_responses(course_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_user_id ON public.user_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_course_id ON public.user_courses(course_id);

-- ============================================
-- STEP 5: Enable RLS
-- Copy and run this section FIFTH
-- ============================================

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: Create RLS policies
-- Copy and run this section SIXTH
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can insert their own survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can view their own enrolled courses" ON public.user_courses;
DROP POLICY IF EXISTS "Users can enroll themselves in courses" ON public.user_courses;

-- Create new policies
CREATE POLICY "Users can view their own survey responses" 
ON public.survey_responses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own survey responses" 
ON public.survey_responses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own enrolled courses" 
ON public.user_courses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll themselves in courses" 
ON public.user_courses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STEP 7: Verify tables were created
-- Copy and run this section LAST
-- ============================================

SELECT 
    table_name,
    'Table exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('survey_responses', 'user_courses')
ORDER BY table_name;

-- Check columns
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('survey_responses', 'user_courses')
ORDER BY table_name, ordinal_position;
