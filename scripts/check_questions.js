import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xaijemaeaqmqczdmozbp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhaWplbWFlYXFtcWN6ZG1vemJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjkxMzEsImV4cCI6MjA4NTEwNTEzMX0.cDJ2J7DlKVz5sc2c571EPmJ_ACj1-W__QTYdVkL0fuA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkQuestions() {
  const courseId = '44e1ef24-5092-419a-a734-daa9340e2056';
  
  try {
    const { data: units, error: unitsErr } = await supabase
      .from('units')
      .select('id, title, order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
      
    if (unitsErr) throw unitsErr;
    
    console.log(`Course: বাংলাদেশ শ্রম আইন, ২০০৬ (${courseId})`);
    console.log(`Total units: ${units.length}\n`);
    
    for (const unit of units) {
      const { data: chapters, error: chapsErr } = await supabase
        .from('chapters')
        .select('id, title, order_index')
        .eq('unit_id', unit.id)
        .order('order_index', { ascending: true });
        
      if (chapsErr) throw chapsErr;
      
      let totalQ = 0;
      let chapsWithQ = 0;
      
      for (const chap of chapters) {
        const { count, error: qErr } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('chapter_id', chap.id);
          
        if (qErr) throw qErr;
        totalQ += count || 0;
        if (count > 0) chapsWithQ++;
      }
      
      console.log(`Unit ${unit.order_index}: ${unit.title}`);
      console.log(`  Chapters: ${chapters.length} | Chapters with Questions: ${chapsWithQ}/${chapters.length} | Total Questions: ${totalQ}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkQuestions();
