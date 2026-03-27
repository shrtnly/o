-- ========================================================
-- DISABLE EMAIL VERIFICATION (AUTO-CONFIRM NEW USERS)
-- ========================================================

-- Create a trigger that automatically marks new users as verified
-- This is useful if you cannot access the Supabase Dashboard settings.

CREATE OR REPLACE FUNCTION public.auto_confirm_new_user() 
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = auth, public
AS $$
BEGIN
  -- Set the email as confirmed before the record is saved
  NEW.email_confirmed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;

-- Bind the trigger to run BEFORE a user is created in auth.users
CREATE TRIGGER on_auth_user_created_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.auto_confirm_new_user();


-- ========================================================
-- AUTOMATIC WELCOME NOTIFICATION
-- ========================================================

-- Create a function to send a welcome notification
CREATE OR REPLACE FUNCTION public.send_welcome_notification() 
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Insert a welcome notification for the new user
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
  
  -- Also add to notification history
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

-- Bind the trigger to run AFTER a user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_welcome ON auth.users;
CREATE TRIGGER on_auth_user_created_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.send_welcome_notification();
