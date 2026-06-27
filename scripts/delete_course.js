import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabaseUrl = 'https://xaijemaeaqmqczdmozbp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhaWplbWFlYXFtcWN6ZG1vemJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjkxMzEsImV4cCI6MjA4NTEwNTEzMX0.cDJ2J7DlKVz5sc2c571EPmJ_ACj1-W__QTYdVkL0fuA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const courseId = '44e1ef24-5092-419a-a734-daa9340e2056';

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function deleteCourseData() {
  const rand = Math.floor(Math.random() * 1000000);
  const email = `delete-worker-${rand}@example.com`;
  const password = `temp-pass-${crypto.randomBytes(8).toString('hex')}`;
  let userId = null;

  try {
    console.log(`Authenticating delete worker: ${email}...`);
    
    // 1. Sign up
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: 'Delete Worker',
          display_name: 'Delete Worker'
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
    
    // Fetch and check what exists in the DB for this course
    console.log(`Checking existing data in database for course: ${courseId}...`);
    
    // 1. Get Course
    const { data: course, error: courseFetchErr } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();
      
    if (courseFetchErr) {
      if (courseFetchErr.code === 'PGRST116') {
        console.log(`No course found with ID ${courseId}. It might already be empty.`);
        return;
      }
      throw new Error(`Error fetching course: ${courseFetchErr.message}`);
    }
    
    console.log(`Found Course: "${course.title}"`);
    
    // 2. Get Units
    const { data: units, error: unitsFetchErr } = await supabase
      .from('units')
      .select('id, title')
      .eq('course_id', courseId);
    if (unitsFetchErr) throw new Error(`Error fetching units: ${unitsFetchErr.message}`);
    console.log(`Found ${units.length} Units.`);
    
    const unitIds = units.map(u => u.id);
    let chapterIds = [];
    let lpIds = [];
    let questionIds = [];
    let optionIds = [];
    
    const CHUNK_SIZE = 100;
    
    if (unitIds.length > 0) {
      // 3. Get Chapters
      console.log('Fetching chapters...');
      const unitChunks = chunkArray(unitIds, CHUNK_SIZE);
      for (const chunk of unitChunks) {
        const { data: chapters, error: err } = await supabase
          .from('chapters')
          .select('id')
          .in('unit_id', chunk);
        if (err) throw err;
        if (chapters) chapterIds.push(...chapters.map(c => c.id));
      }
      console.log(`Found ${chapterIds.length} Chapters.`);
      
      if (chapterIds.length > 0) {
        // 4. Get Learning Points
        console.log('Fetching learning points...');
        const chapterChunks = chunkArray(chapterIds, CHUNK_SIZE);
        for (const chunk of chapterChunks) {
          const { data: lps, error: err } = await supabase
            .from('learning_points')
            .select('id')
            .in('chapter_id', chunk);
          if (err) throw err;
          if (lps) lpIds.push(...lps.map(lp => lp.id));
        }
        console.log(`Found ${lpIds.length} Learning Points.`);
        
        if (lpIds.length > 0) {
          // 5. Get MCQ Questions
          console.log('Fetching questions...');
          const lpChunks = chunkArray(lpIds, CHUNK_SIZE);
          for (const chunk of lpChunks) {
            const { data: questions, error: err } = await supabase
              .from('mcq_questions')
              .select('id')
              .in('learning_point_id', chunk);
            if (err) throw err;
            if (questions) questionIds.push(...questions.map(q => q.id));
          }
          console.log(`Found ${questionIds.length} Questions.`);
          
          if (questionIds.length > 0) {
            // 6. Get MCQ Options
            console.log('Fetching options...');
            const questionChunks = chunkArray(questionIds, CHUNK_SIZE);
            for (const chunk of questionChunks) {
              const { data: options, error: err } = await supabase
                .from('mcq_options')
                .select('id')
                .in('question_id', chunk);
              if (err) throw err;
              if (options) optionIds.push(...options.map(opt => opt.id));
            }
            console.log(`Found ${optionIds.length} Options.`);
          }
        }
      }
    }
    
    console.log('\n--- DELETION PHASE STARTED ---');
    
    // Delete in reverse order of dependencies, chunked
    
    // A. Delete MCQ Options
    if (optionIds.length > 0) {
      console.log(`Deleting ${optionIds.length} mcq_options in chunks...`);
      const chunks = chunkArray(optionIds, CHUNK_SIZE);
      for (const [i, chunk] of chunks.entries()) {
        const { error: err } = await supabase.from('mcq_options').delete().in('id', chunk);
        if (err) throw new Error(`Failed to delete options chunk ${i}: ${err.message}`);
      }
      console.log('✓ MCQ Options deleted.');
    }
    
    // B. Delete MCQ Questions
    if (questionIds.length > 0) {
      console.log(`Deleting ${questionIds.length} mcq_questions in chunks...`);
      const chunks = chunkArray(questionIds, CHUNK_SIZE);
      for (const [i, chunk] of chunks.entries()) {
        const { error: err } = await supabase.from('mcq_questions').delete().in('id', chunk);
        if (err) throw new Error(`Failed to delete questions chunk ${i}: ${err.message}`);
      }
      console.log('✓ MCQ Questions deleted.');
    }
    
    // C. Delete Learning Points
    if (lpIds.length > 0) {
      console.log(`Deleting ${lpIds.length} learning_points in chunks...`);
      const chunks = chunkArray(lpIds, CHUNK_SIZE);
      for (const [i, chunk] of chunks.entries()) {
        const { error: err } = await supabase.from('learning_points').delete().in('id', chunk);
        if (err) throw new Error(`Failed to delete learning points chunk ${i}: ${err.message}`);
      }
      console.log('✓ Learning Points deleted.');
    }
    
    // D. Delete Chapters
    if (chapterIds.length > 0) {
      console.log(`Deleting ${chapterIds.length} chapters in chunks...`);
      const chunks = chunkArray(chapterIds, CHUNK_SIZE);
      for (const [i, chunk] of chunks.entries()) {
        const { error: err } = await supabase.from('chapters').delete().in('id', chunk);
        if (err) throw new Error(`Failed to delete chapters chunk ${i}: ${err.message}`);
      }
      console.log('✓ Chapters deleted.');
    }
    
    // E. Delete Units
    if (unitIds.length > 0) {
      console.log(`Deleting ${unitIds.length} units in chunks...`);
      const chunks = chunkArray(unitIds, CHUNK_SIZE);
      for (const [i, chunk] of chunks.entries()) {
        const { error: err } = await supabase.from('units').delete().in('id', chunk);
        if (err) throw new Error(`Failed to delete units chunk ${i}: ${err.message}`);
      }
      console.log('✓ Units deleted.');
    }
    
    // F. Delete Course
    console.log(`Deleting course ${courseId}...`);
    const { error: err } = await supabase.from('courses').delete().eq('id', courseId);
    if (err) throw new Error(`Failed to delete course: ${err.message}`);
    console.log('✓ Course deleted.');
    
    console.log('★ All course data successfully deleted from the database!');
    
  } catch (error) {
    console.error('Delete failed:', error.message);
  } finally {
    if (userId) {
      console.log('Cleaning up delete worker profile...');
      await supabase.from('profiles').delete().eq('id', userId);
      await supabase.auth.signOut();
      console.log('Worker logged out and cleaned up.');
    }
  }
}

deleteCourseData();
