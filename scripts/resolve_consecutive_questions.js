/* global process */
import fs from 'fs';
import path from 'path';

const filePaths = [
  path.join(process.cwd(), 'database', 'courses', 'bangladesh_labor_law_2006.json'),
  path.join(process.cwd(), 'database', 'courses', 'cyber_threat_and_scam.json'),
  path.join(process.cwd(), 'database', 'courses', 'password_and_account_security.json'),
  path.join(process.cwd(), 'scratch', 'cv_course_backup.json'),
  path.join(process.cwd(), 'scratch', 'cyber_course_backup.json'),
  path.join(process.cwd(), 'scratch', 'password_and_account_security_backup.json')
];

function getQuestionType(lp) {
  const q = lp.mcq_questions && lp.mcq_questions[0];
  return q?.question_type || lp.type;
}

function shuffleWithoutConsecutive(lps) {
  if (!lps || lps.length <= 1) return lps;

  const maxAttempts = 5000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Shuffled copy
    const shuffled = [...lps];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Check consecutive duplicate types and matching position
    let valid = true;
    for (let i = 0; i < shuffled.length; i++) {
      const type = getQuestionType(shuffled[i]);

      // Matching must not be in the first 3 positions (index 0, 1, 2)
      if (type === 'matching' && i < 3) {
        valid = false;
        break;
      }

      if (i < shuffled.length - 1) {
        const nextType = getQuestionType(shuffled[i + 1]);
        if (type === nextType) {
          valid = false;
          break;
        }
      }
    }

    if (valid) {
      // Re-assign order_index
      shuffled.forEach((lp, idx) => {
        lp.order_index = idx + 1;
      });
      return shuffled;
    }
  }

  // Fallback: If no perfect shuffle is found (e.g. too many questions of one type),
  // we do our best by keeping the shuffled list but with minimal consecutive matches.
  console.warn(`⚠️ Warning: Could not find consecutive-free order for chapter. Fallback applied.`);
  lps.forEach((lp, idx) => {
    lp.order_index = idx + 1;
  });
  return lps;
}

console.log('🔄 Reordering learning points to avoid consecutive question types & first-3 matching questions...');

for (const filePath of filePaths) {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping: File not found at ${filePath}`);
    continue;
  }

  console.log(`Processing file: ${filePath}`);
  const courseData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let fixCount = 0;

  if (courseData.units) {
    courseData.units.forEach(unit => {
      if (unit.chapters) {
        unit.chapters.forEach(chapter => {
          if (chapter.learning_points && chapter.learning_points.length > 1) {
            // Check if chapter needs fixing
            let needFix = false;
            for (let i = 0; i < chapter.learning_points.length; i++) {
              const type = getQuestionType(chapter.learning_points[i]);

              // Rule 1: Matching question must not be at index < 3
              if (type === 'matching' && i < 3) {
                needFix = true;
                break;
              }

              // Rule 2: Consecutive duplicate types
              if (i < chapter.learning_points.length - 1) {
                const nextType = getQuestionType(chapter.learning_points[i + 1]);
                if (type === nextType) {
                  needFix = true;
                  break;
                }
              }
            }

            if (needFix) {
              const oldLps = chapter.learning_points;
              chapter.learning_points = shuffleWithoutConsecutive(oldLps);
              fixCount++;
            }
          }
        });
      }
    });
  }

  fs.writeFileSync(filePath, JSON.stringify(courseData, null, 2), 'utf-8');
  console.log(`✓ Finished. Modified ${fixCount} chapters.`);
}

console.log('✨ All files updated successfully!');
