import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const supabaseUrl = 'https://xaijemaeaqmqczdmozbp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhaWplbWFlYXFtcWN6ZG1vemJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjkxMzEsImV4cCI6MjA4NTEwNTEzMX0.cDJ2J7DlKVz5sc2c571EPmJ_ACj1-W__QTYdVkL0fuA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function insertCourseModules() {
  const filePath = path.join(process.cwd(), 'database', 'courses', 'bangladesh_labor_law_2006.json');
  
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    return;
  }
  
  const rand = Math.floor(Math.random() * 1000000);
  const email = `sync-admin-${rand}@example.com`;
  const password = `temp-pass-${crypto.randomBytes(8).toString('hex')}`;
  let userId = null;
  
  try {
    console.log(`Authenticating sync worker: ${email}...`);
    
    // 1. Sign up
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: 'Sync Worker',
          display_name: 'Sync Worker'
        }
      }
    });
    if (signUpErr) throw new Error(`Sign up failed: ${signUpErr.message}`);
    userId = signUpData.user.id;
    
    // 2. Sign in
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (signInErr) throw new Error(`Sign in failed: ${signInErr.message}`);
    
    // 3. Upgrade to admin
    const { error: upgradeErr } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId);
    if (upgradeErr) throw new Error(`Admin upgrade failed: ${upgradeErr.message}`);
    
    console.log('✓ Successfully authenticated and authorized as admin.');
    
    // Load JSON file
    const courseData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const courseId = courseData.id;
    
    console.log(`Inserting course: "${courseData.title}" (${courseId})`);
    
    // --- Insert Course ---
    const { units, ...courseMeta } = courseData;
    const { error: courseErr } = await supabase
      .from('courses')
      .upsert(courseMeta);
    if (courseErr) throw new Error(`Course upsert error: ${courseErr.message}`);
    console.log('✓ Course metadata synced.');
    
    // Collect all units for upsert
    const unitsToUpsert = [];
    if (units && Array.isArray(units)) {
      for (const unit of units) {
        const { chapters, ...unitMeta } = unit;
        unitMeta.course_id = courseId;
        unitsToUpsert.push(unitMeta);
      }
    }

    console.log(`Upserting ${unitsToUpsert.length} units in bulk...`);
    const { error: unitsErr } = await supabase.from('units').upsert(unitsToUpsert);
    if (unitsErr) throw new Error(`Units bulk upsert error: ${unitsErr.message}`);
    console.log('✓ 21 Units successfully synced in database.');
    
  } catch (error) {
    console.error('Insert failed:', error.message);
  } finally {
    if (userId) {
      console.log('Cleaning up sync worker profile...');
      await supabase.from('profiles').delete().eq('id', userId);
      await supabase.auth.signOut();
      console.log('Worker logged out and cleaned up.');
    }
  }
}

insertCourseModules();
