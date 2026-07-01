/* global process */
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'scratch', 'cv_course_backup.json');
if (fs.existsSync(filePath)) {
  const courseData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const chapter = courseData.units
    .flatMap(u => u.chapters || [])
    .find(c => c.title.includes('সফটওয়্যার ম্যাচিং স্কোর'));

  if (chapter) {
    const lp = chapter.learning_points.find(l => l.title.includes('ম্যাচিং স্কোর'));
    if (lp && lp.mcq_questions && lp.mcq_questions[0]) {
      const q = lp.mcq_questions[0];
      q.question_type = 'boolean';
      q.question_text = 'এটিএস-এ ম্যাচিং স্কোর (Matching Score) বলতে সিভির সাথে চাকরির বিজ্ঞপ্তির যোগ্যতার মিলের শতকরা হারকে বোঝায়। উক্তিটি কি সত্য?';
      q.mcq_options = [
        {
          id: q.mcq_options[0]?.id || 'opt-1-generated',
          question_id: q.id,
          option_text: 'সত্য',
          is_correct: true,
          created_at: q.created_at,
          order_index: 1
        },
        {
          id: q.mcq_options[1]?.id || 'opt-2-generated',
          question_id: q.id,
          option_text: 'মিথ্যা',
          is_correct: false,
          created_at: q.created_at,
          order_index: 2
        }
      ];
      console.log('✓ Successfully patched CV course LP to boolean.');
      fs.writeFileSync(filePath, JSON.stringify(courseData, null, 2), 'utf-8');
    } else {
      console.log('❌ Could not find the learning point in CV course.');
    }
  } else {
    console.log('❌ Could not find the chapter in CV course.');
  }
} else {
  console.log('❌ CV course backup file not found.');
}
