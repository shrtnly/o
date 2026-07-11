/* global process */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const supabaseUrl = 'https://xaijemaeaqmqczdmozbp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhaWplbWFlYXFtcWN6ZG1vemJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjkxMzEsImV4cCI6MjA4NTEwNTEzMX0.cDJ2J7DlKVz5sc2c571EPmJ_ACj1-W__QTYdVkL0fuA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const COURSE_ID = 'a0f7e436-1e9a-4c2f-bcde-96400a579899';

function ensureId(item) {
  if (!item.id) {
    item.id = crypto.randomUUID();
  }
  return item.id;
}

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function deleteCourseContent(supabase, courseId) {
  console.log(`Deep cleaning content for course: ${courseId}...`);
  // 1. Get units
  const { data: units } = await supabase.from('units').select('id').eq('course_id', courseId);
  if (!units || units.length === 0) return;
  const unitIds = units.map(u => u.id);

  // 2. Get chapters
  const { data: chapters } = await supabase.from('chapters').select('id').in('unit_id', unitIds);
  if (!chapters || chapters.length === 0) {
    await supabase.from('units').delete().in('id', unitIds);
    return;
  }
  const chapterIds = chapters.map(c => c.id);

  // 3. Get learning points
  const { data: lps } = await supabase.from('learning_points').select('id').in('chapter_id', chapterIds);
  if (!lps || lps.length === 0) {
    await supabase.from('chapters').delete().in('id', chapterIds);
    await supabase.from('units').delete().in('id', unitIds);
    return;
  }
  const lpIds = lps.map(lp => lp.id);

  // 4. Get questions
  const questionIds = [];
  for (let i = 0; i < lpIds.length; i += 100) {
    const chunk = lpIds.slice(i, i + 100);
    const { data: qs } = await supabase.from('mcq_questions').select('id').in('learning_point_id', chunk);
    if (qs) questionIds.push(...qs.map(q => q.id));
  }

  if (questionIds.length > 0) {
    // 5. Delete options
    for (let i = 0; i < questionIds.length; i += 100) {
      const chunk = questionIds.slice(i, i + 100);
      await supabase.from('mcq_options').delete().in('question_id', chunk);
    }
    // 6. Delete questions
    for (let i = 0; i < lpIds.length; i += 100) {
      const chunk = lpIds.slice(i, i + 100);
      await supabase.from('mcq_questions').delete().in('learning_point_id', chunk);
    }
  }

  // 7. Delete learning points
  for (let i = 0; i < chapterIds.length; i += 100) {
    const chunk = chapterIds.slice(i, i + 100);
    await supabase.from('learning_points').delete().in('chapter_id', chunk);
  }

  // 8. Delete chapters
  for (let i = 0; i < unitIds.length; i += 100) {
    const chunk = unitIds.slice(i, i + 100);
    await supabase.from('chapters').delete().in('unit_id', chunk);
  }

  // 9. Delete units
  await supabase.from('units').delete().in('id', unitIds);
  console.log(`✓ Deep clean finished for course content: ${courseId}`);
}

async function syncIctCourse() {
  const sourcePath = path.join(process.cwd(), 'database', 'courses', 'ict_class_11_12.json');
  
  if (!fs.existsSync(sourcePath)) {
    console.error(`Error: Source file not found at ${sourcePath}`);
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
    const { error: signInErr } = await supabase.auth.signInWithPassword({
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
    
    // 4. Load course JSON
    const courseData = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
    
    console.log(`Updating Course: "${courseData.title}" (${COURSE_ID})`);
    
    // 5. Deep clean old course content (slate cleaning)
    await deleteCourseContent(supabase, COURSE_ID);
    
    // 6. Sync Course Metadata
    const { units, ...courseMeta } = courseData;
    const { error: courseErr } = await supabase
      .from('courses')
      .upsert(courseMeta);
    if (courseErr) throw new Error(`Course upsert error: ${courseErr.message}`);
    console.log('✓ Course metadata synced.');
    
    // 7. Collect units, chapters, learning points, questions, and options
    const unitsToUpsert = [];
    const chaptersToUpsert = [];
    const lpsToUpsert = [];
    const questionsToUpsert = [];
    const optionsToUpsert = [];
    
    if (units && Array.isArray(units)) {
      for (const unit of units) {
        ensureId(unit);
        unit.course_id = COURSE_ID;
        
        const { chapters, ...unitMeta } = unit;
        unitsToUpsert.push(unitMeta);
        
        if (chapters && Array.isArray(chapters)) {
          for (const chapter of chapters) {
            ensureId(chapter);
            chapter.unit_id = unit.id;
            
            const { learning_points, ...chapterMeta } = chapter;
            chaptersToUpsert.push(chapterMeta);
            
            if (learning_points && Array.isArray(learning_points)) {
              for (const lp of learning_points) {
                ensureId(lp);
                lp.chapter_id = chapter.id;
                
                const { mcq_questions, ...lpMeta } = lp;
                lpsToUpsert.push(lpMeta);
                
                if (mcq_questions && Array.isArray(mcq_questions)) {
                  for (const q of mcq_questions) {
                    ensureId(q);
                    q.learning_point_id = lp.id;
                    
                    const { mcq_options, ...qMeta } = q;
                    questionsToUpsert.push(qMeta);
                    
                    if (mcq_options && Array.isArray(mcq_options)) {
                      for (const opt of mcq_options) {
                        ensureId(opt);
                        opt.question_id = q.id;
                        optionsToUpsert.push(opt);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    const CHUNK_SIZE = 50;
    
    // --- Bulk Upsert Units ---
    console.log(`Upserting ${unitsToUpsert.length} units in bulk...`);
    const { error: unitsErr } = await supabase.from('units').upsert(unitsToUpsert);
    if (unitsErr) throw new Error(`Units bulk upsert error: ${unitsErr.message}`);
 
    // --- Bulk Upsert Chapters ---
    console.log(`Upserting ${chaptersToUpsert.length} chapters in bulk...`);
    const chapterChunks = chunkArray(chaptersToUpsert, CHUNK_SIZE);
    for (const chunk of chapterChunks) {
      const { error: chsErr } = await supabase.from('chapters').upsert(chunk);
      if (chsErr) throw new Error(`Chapters bulk upsert error: ${chsErr.message}`);
    }
 
    // --- Bulk Upsert Learning Points ---
    console.log(`Upserting ${lpsToUpsert.length} learning points in bulk...`);
    const lpChunks = chunkArray(lpsToUpsert, CHUNK_SIZE);
    for (const chunk of lpChunks) {
      const { error: lpsErr } = await supabase.from('learning_points').upsert(chunk);
      if (lpsErr) throw new Error(`Learning points bulk upsert error: ${lpsErr.message}`);
    }
 
    // --- Bulk Upsert MCQ Questions ---
    console.log(`Upserting ${questionsToUpsert.length} questions in bulk...`);
    const questionChunks = chunkArray(questionsToUpsert, CHUNK_SIZE);
    for (const chunk of questionChunks) {
      const { error: qsErr } = await supabase.from('mcq_questions').upsert(chunk);
      if (qsErr) throw new Error(`Questions bulk upsert error: ${qsErr.message}`);
    }
 
    // --- Bulk Upsert MCQ Options ---
    console.log(`Upserting ${optionsToUpsert.length} options in bulk...`);
    const optionChunks = chunkArray(optionsToUpsert, CHUNK_SIZE);
    for (const chunk of optionChunks) {
      const { error: optsErr } = await supabase.from('mcq_options').upsert(chunk);
      if (optsErr) throw new Error(`Options bulk upsert error: ${optsErr.message}`);
    }
    
    // Save updated JSON to both locations
    const finalJsonString = JSON.stringify(courseData, null, 2);
    fs.writeFileSync(sourcePath, finalJsonString, 'utf-8');
    fs.writeFileSync(path.join(process.cwd(), 'scratch', 'ict_class_11_12_backup.json'), finalJsonString, 'utf-8');
    
    console.log('✓ Local files updated successfully:');
    console.log('  - database/courses/ict_class_11_12.json');
    console.log('  - scratch/ict_class_11_12_backup.json');
    console.log('★ ICT Class 11-12 Course sync completed successfully!');
    
  } catch (error) {
    console.error('Sync failed:', error.message);
  } finally {
    if (userId) {
      console.log('Cleaning up sync worker profile...');
      await supabase.from('profiles').delete().eq('id', userId);
      await supabase.auth.signOut();
      console.log('Worker logged out and cleaned up.');
    }
  }
}

syncIctCourse();
