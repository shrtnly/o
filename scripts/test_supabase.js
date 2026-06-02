import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xaijemaeaqmqczdmozbp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhaWplbWFlYXFtcWN6ZG1vemJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjkxMzEsImV4cCI6MjA4NTEwNTEzMX0.cDJ2J7DlKVz5sc2c571EPmJ_ACj1-W__QTYdVkL0fuA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const dummyUserId = '00000000-0000-0000-0000-000000000000';
  console.log('Inserting test profile...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        id: dummyUserId,
        xp: 250,
        gems: 120,
        hearts: 8,
        max_hearts: 10,
        display_name: 'Test Learner',
        full_name: 'Test Learner',
        battle_mode: true
      }])
      .select();
    
    if (error) {
      console.error('Error inserting profile:', error);
    } else {
      console.log('Profile inserted successfully!', data);
      // Now clean up
      await supabase.from('profiles').delete().eq('id', dummyUserId);
      console.log('Cleaned up test profile.');
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

run();
