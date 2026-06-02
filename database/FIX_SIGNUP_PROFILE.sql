-- ========================================================
-- DATABASE FIX: AUTOMATIC PROFILE CREATION ON USER SIGNUP
-- Run this SQL in your Supabase SQL Editor
-- ========================================================

-- Update the existing send_welcome_notification function to also handle profile creation
CREATE OR REPLACE FUNCTION public.send_welcome_notification() 
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- 1. Create default profile for the user if not exists
  INSERT INTO public.profiles (
    id,
    xp,
    gems,
    hearts,
    max_hearts,
    display_name,
    full_name,
    avatar_url,
    battle_mode,
    role
  )
  VALUES (
    NEW.id,
    250,
    120,
    8,
    10,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'Learner'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', 'Learner'),
    NEW.raw_user_meta_data->>'avatar_url',
    true,
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Insert a welcome notification for the new user
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    data
  )
  VALUES (
    NEW.id,
    'welcome',
    'স্বাগতম BeeLesson-এ!',
    'আপনার যাত্রা শুরু করার জন্য অভিনন্দন! এখন থেকেই শুরু করুন আপনার শেখার নতুন অভিজ্ঞতা।',
    jsonb_build_object('welcome_bonus', 'unlocked')
  );
  
  -- 3. Also add to notification history
  INSERT INTO public.notification_history (
    user_id,
    title,
    message,
    type
  )
  VALUES (
    NEW.id,
    'Welcome!',
    'Congratulations on joining BeeLesson! Start your learning journey now.',
    'info'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind/Re-bind the trigger to run AFTER a user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_welcome ON auth.users;
CREATE TRIGGER on_auth_user_created_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.send_welcome_notification();

-- OPTIONAL: Create profiles for any existing users that might be missing one
INSERT INTO public.profiles (id, xp, gems, hearts, max_hearts, display_name, full_name, avatar_url, battle_mode, role)
SELECT 
  u.id,
  250,
  120,
  8,
  10,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Learner'),
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'display_name', 'Learner'),
  u.raw_user_meta_data->>'avatar_url',
  true,
  'user'
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
