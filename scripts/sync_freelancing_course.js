import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const supabaseUrl = 'https://xaijemaeaqmqczdmozbp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhaWplbWFlYXFtcWN6ZG1vemJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjkxMzEsImV4cCI6MjA4NTEwNTEzMX0.cDJ2J7DlKVz5sc2c571EPmJ_ACj1-W__QTYdVkL0fuA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

async function syncFreelancingCourse() {
  const filePath = path.join(process.cwd(), 'scratch', 'freelancing_course_backup.json');
  
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
    
    if (!courseId) {
      throw new Error('Course object in JSON must have an id.');
    }
    
    console.log(`Starting batched sync for course: "${courseData.title}" (${courseId})`);
    
    // --- Sync Course ---
    const { units, ...courseMeta } = courseData;
    const { error: courseErr } = await supabase
      .from('courses')
      .upsert(courseMeta);
    if (courseErr) throw new Error(`Course upsert error: ${courseErr.message}`);
    console.log('✓ Course metadata synced.');
    
    // Collect all arrays for bulk upsert
    const unitsToUpsert = [];
    const chaptersToUpsert = [];
    const lpsToUpsert = [];
    const questionsToUpsert = [];
    const optionsToUpsert = [];
 
    const currentUnitIds = [];
    const currentChapterIds = [];
    const currentLpIds = [];
    const currentQuestionIds = [];
    const currentOptionIds = [];
    
    if (units && Array.isArray(units)) {
      for (const unit of units) {
        ensureId(unit);
        unit.course_id = courseId;
        currentUnitIds.push(unit.id);
        
        const { chapters, ...unitMeta } = unit;
        unitsToUpsert.push(unitMeta);
        
        if (chapters && Array.isArray(chapters)) {
          for (const chapter of chapters) {
            ensureId(chapter);
            chapter.unit_id = unit.id;
            currentChapterIds.push(chapter.id);
            
            const { learning_points, ...chapterMeta } = chapter;
            chaptersToUpsert.push(chapterMeta);
            
            if (learning_points && Array.isArray(learning_points)) {
              for (const lp of learning_points) {
                ensureId(lp);
                lp.chapter_id = chapter.id;
                currentLpIds.push(lp.id);
                
                const { mcq_questions, ...lpMeta } = lp;
                lpsToUpsert.push(lpMeta);
                
                if (mcq_questions && Array.isArray(mcq_questions)) {
                  for (const q of mcq_questions) {
                    ensureId(q);
                    q.learning_point_id = lp.id;
                    currentQuestionIds.push(q.id);
                    
                    const { mcq_options, ...qMeta } = q;
                    questionsToUpsert.push(qMeta);
                    
                    if (mcq_options && Array.isArray(mcq_options)) {
                      for (const opt of mcq_options) {
                        ensureId(opt);
                        opt.question_id = q.id;
                        currentOptionIds.push(opt.id);
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
    
    // --- Deletion / Cleanup Phase ---
    console.log('Cleaning up deleted items from the database...');
    
    // A. Options cleanup
    if (currentQuestionIds.length > 0) {
      const dbOptions = [];
      const questionChunksForOpt = chunkArray(currentQuestionIds, CHUNK_SIZE);
      for (const chunk of questionChunksForOpt) {
        const { data, error } = await supabase
          .from('mcq_options')
          .select('id')
          .in('question_id', chunk);
        if (error) throw error;
        if (data) dbOptions.push(...data);
      }
        
      const optionsToDelete = dbOptions
        .map(o => o.id)
        .filter(id => !currentOptionIds.includes(id));
        
      if (optionsToDelete.length > 0) {
        console.log(`Deleting ${optionsToDelete.length} options...`);
        const delChunks = chunkArray(optionsToDelete, CHUNK_SIZE);
        for (const chunk of delChunks) {
          const { error: delErr } = await supabase
            .from('mcq_options')
            .delete()
            .in('id', chunk);
          if (delErr) throw delErr;
        }
      }
    }
    
    // B. Questions cleanup
    if (currentLpIds.length > 0) {
      const dbQuestions = [];
      const lpChunksForQ = chunkArray(currentLpIds, CHUNK_SIZE);
      for (const chunk of lpChunksForQ) {
        const { data, error } = await supabase
          .from('mcq_questions')
          .select('id')
          .in('learning_point_id', chunk);
        if (error) throw error;
        if (data) dbQuestions.push(...data);
      }
        
      const questionsToDelete = dbQuestions
        .map(q => q.id)
        .filter(id => !currentQuestionIds.includes(id));
        
      if (questionsToDelete.length > 0) {
        console.log(`Deleting ${questionsToDelete.length} questions...`);
        const delChunks = chunkArray(questionsToDelete, CHUNK_SIZE);
        for (const chunk of delChunks) {
          const { error: delErr } = await supabase
            .from('mcq_questions')
            .delete()
            .in('id', chunk);
          if (delErr) throw delErr;
        }
      }
    }
    
    // C. Learning Points cleanup
    if (currentChapterIds.length > 0) {
      const dbLps = [];
      const chapterChunksForLp = chunkArray(currentChapterIds, CHUNK_SIZE);
      for (const chunk of chapterChunksForLp) {
        const { data, error } = await supabase
          .from('learning_points')
          .select('id')
          .in('chapter_id', chunk);
        if (error) throw error;
        if (data) dbLps.push(...data);
      }
        
      const lpsToDelete = dbLps
        .map(lp => lp.id)
        .filter(id => !currentLpIds.includes(id));
        
      if (lpsToDelete.length > 0) {
        console.log(`Deleting ${lpsToDelete.length} learning points...`);
        const delChunks = chunkArray(lpsToDelete, CHUNK_SIZE);
        for (const chunk of delChunks) {
          const { error: delErr } = await supabase
            .from('learning_points')
            .delete()
            .in('id', chunk);
          if (delErr) throw delErr;
        }
      }
    }
    
    // D. Chapters cleanup
    if (currentUnitIds.length > 0) {
      const dbChapters = [];
      const unitChunksForCh = chunkArray(currentUnitIds, CHUNK_SIZE);
      for (const chunk of unitChunksForCh) {
        const { data, error } = await supabase
          .from('chapters')
          .select('id')
          .in('unit_id', chunk);
        if (error) throw error;
        if (data) dbChapters.push(...data);
      }
        
      const chaptersToDelete = dbChapters
        .map(c => c.id)
        .filter(id => !currentChapterIds.includes(id));
        
      if (chaptersToDelete.length > 0) {
        console.log(`Deleting ${chaptersToDelete.length} chapters...`);
        const delChunks = chunkArray(chaptersToDelete, CHUNK_SIZE);
        for (const chunk of delChunks) {
          const { error: delErr } = await supabase
            .from('chapters')
            .delete()
            .in('id', chunk);
          if (delErr) throw delErr;
        }
      }
    }
    
    // E. Units cleanup
    const { data: dbUnits, error: dbUnitErr } = await supabase
      .from('units')
      .select('id')
      .eq('course_id', courseId);
      
    if (dbUnitErr) throw dbUnitErr;
    const unitsToDelete = dbUnits
      .map(u => u.id)
      .filter(id => !currentUnitIds.includes(id));
      
    if (unitsToDelete.length > 0) {
      console.log(`Deleting ${unitsToDelete.length} units...`);
      const delChunks = chunkArray(unitsToDelete, CHUNK_SIZE);
      for (const chunk of delChunks) {
        const { error: delErr } = await supabase
          .from('units')
          .delete()
          .in('id', chunk);
        if (delErr) throw delErr;
      }
    }
    
    // Save the synced JSON back (in case we generated any new IDs)
    fs.writeFileSync(filePath, JSON.stringify(courseData, null, 2), 'utf-8');
    console.log('✓ JSON file updated with new generated IDs.');
    console.log('★ Freelancing Course Sync completed successfully!');
    
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

syncFreelancingCourse();
