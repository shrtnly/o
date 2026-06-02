import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xaijemaeaqmqczdmozbp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhaWplbWFlYXFtcWN6ZG1vemJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjkxMzEsImV4cCI6MjA4NTEwNTEzMX0.cDJ2J7DlKVz5sc2c571EPmJ_ACj1-W__QTYdVkL0fuA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const testUserId = 'f74c760e-8c31-419b-a320-b48c217424b9'; // Example user ID (if any) or dummy
  
  console.log('Testing query 1: courses...');
  try {
    const { data: courses, error: err1 } = await supabase
      .from('courses')
      .select('id, title, title_en, description, description_en, image_url, is_featured, created_at, category, status, students_count, rating')
      .order('created_at', { ascending: false });
    console.log('Query 1 done. Error:', err1, 'Count:', courses?.length);
  } catch (e) {
    console.error('Query 1 exception:', e);
  }

  console.log('Testing query 2: user_courses...');
  try {
    const { data: userCourses, error: err2 } = await supabase
      .from('user_courses')
      .select('course_id')
      .eq('user_id', testUserId);
    console.log('Query 2 done. Error:', err2, 'Count:', userCourses?.length);
  } catch (e) {
    console.error('Query 2 exception:', e);
  }

  console.log('Testing query 3: course_public_stats...');
  try {
    const { data: stats, error: err3 } = await supabase
      .from('course_public_stats')
      .select('course_id, enrolled_count, average_rating');
    console.log('Query 3 done. Error:', err3, 'Count:', stats?.length);
  } catch (e) {
    console.error('Query 3 exception:', e);
  }
}

run();
