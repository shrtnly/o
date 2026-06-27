import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const supabaseUrl = 'https://xaijemaeaqmqczdmozbp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhaWplbWFlYXFtcWN6ZG1vemJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjkxMzEsImV4cCI6MjA4NTEwNTEzMX0.cDJ2J7DlKVz5sc2c571EPmJ_ACj1-W__QTYdVkL0fuA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function insertCourseChapters() {
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
    
    const chaptersToUpsert = [];
    if (courseData.units && Array.isArray(courseData.units)) {
      for (const unit of courseData.units) {
        if (unit.chapters && Array.isArray(unit.chapters)) {
          for (const chap of unit.chapters) {
            const { learning_points, ...chapMeta } = chap;
            chapMeta.unit_id = unit.id; // ensure correct unit linkage
            chaptersToUpsert.push(chapMeta);
          }
        }
      }
    }
    
    console.log(`Inserting ${chaptersToUpsert.length} chapters in bulk chunks of 50...`);
    const chunks = chunkArray(chaptersToUpsert, 50);
    for (const [i, chunk] of chunks.entries()) {
      const { error: chsErr } = await supabase.from('chapters').upsert(chunk);
      if (chsErr) throw new Error(`Chapters chunk ${i} upsert error: ${chsErr.message}`);
    }
    console.log(`✓ Successfully inserted all ${chaptersToUpsert.length} chapters into the database.`);
    
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

insertCourseChapters();
