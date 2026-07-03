/* global process */
import fs from 'fs';
import path from 'path';

const filePaths = [
  path.join(process.cwd(), 'database', 'courses', 'bangladesh_labor_law_2006.json'),
  path.join(process.cwd(), 'database', 'courses', 'cyber_threat_and_scam.json'),
  path.join(process.cwd(), 'database', 'courses', 'password_and_account_security.json'),
  path.join(process.cwd(), 'database', 'courses', 'cyberbullying_and_harassment.json'),
  path.join(process.cwd(), 'database', 'courses', 'productivity_and_time_management.json'),
  path.join(process.cwd(), 'scratch', 'cv_course_backup.json'),
  path.join(process.cwd(), 'scratch', 'cyber_course_backup.json'),
  path.join(process.cwd(), 'scratch', 'password_and_account_security_backup.json'),
  path.join(process.cwd(), 'scratch', 'cyberbullying_and_harassment_backup.json'),
  path.join(process.cwd(), 'scratch', 'productivity_and_time_management_backup.json')
];

// Regex to match: (সবগুলো সিলেক্ট করুন), (টিক দিন), (সবগুলো সিলেক্ট করুন) in parentheses/brackets
const HINTS_REGEX = /\s*[(（][^）]*(সিলেক্ট করুন|টিক দিন)[^）]*[）)]/gu;

console.log('🧹 Removing (সবগুলো সিলেক্ট করুন) and (টিক দিন) hints from questions...');

for (const filePath of filePaths) {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping: File not found at ${filePath}`);
    continue;
  }

  console.log(`Processing file: ${filePath}`);
  const courseData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let cleanCount = 0;

  if (courseData.units) {
    courseData.units.forEach(unit => {
      if (unit.chapters) {
        unit.chapters.forEach(chapter => {
          if (chapter.learning_points) {
            chapter.learning_points.forEach(lp => {
              if (lp.mcq_questions && lp.mcq_questions[0]) {
                const q = lp.mcq_questions[0];
                const oldText = q.question_text || '';
                
                if (HINTS_REGEX.test(oldText)) {
                  const newText = oldText.replace(HINTS_REGEX, '').trim();
                  q.question_text = newText;
                  cleanCount++;
                }
              }
            });
          }
        });
      }
    });
  }

  if (cleanCount > 0) {
    fs.writeFileSync(filePath, JSON.stringify(courseData, null, 2), 'utf-8');
    console.log(`✓ Cleaned ${cleanCount} question texts in this file.`);
  } else {
    console.log(`✓ No matching hints found.`);
  }
}

console.log('✨ All files processed and saved successfully!');
