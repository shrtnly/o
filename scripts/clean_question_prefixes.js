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

const mcqVariations = [
  "নিচের কোন তথ্যটি সঠিক?",
  "নিচের কোন বিবরণটি সঠিক?",
  "নিচের সঠিক তথ্যটি চিহ্নিত করুন:",
  "নিচের কোন উক্তিটি সঠিক?"
];

const checkmarkVariations = [
  "নিচের কোন পদক্ষেপগুলো সঠিক ও নিরাপদ? (সবগুলো সিলেক্ট করুন)",
  "সঠিক ও নিরাপদ পদক্ষেপগুলো নির্বাচন করুন: (সবগুলো সিলেক্ট করুন)",
  "নিচের কোন বিকল্পগুলো সঠিক পদক্ষেপ নির্দেশ করে? (সবগুলো সিলেক্ট করুন)",
  "নিচের কোনগুলো সঠিক পদক্ষেপ? (সবগুলো সিলেক্ট করুন)"
];

const matchingVariations = [
  "বাম পাশের তথ্যের সাথে ডান পাশের তথ্যের সঠিক মিল করুন:",
  "নিচের উপাদানগুলোর সঠিক মিল করুন:",
  "সঠিক জোড়াগুলো মেলান:",
  "বাম ও ডান কলামের সঠিক মিল করুন:"
];

const storytellingVariations = [
  "লিসার কথা অনুযায়ী, রাকিবের জন্য কোনটি সঠিক পদক্ষেপ হবে?",
  "লিসার পরামর্শ অনুযায়ী রাকিবের কী করা উচিত?",
  "লিসার বক্তব্য থেকে রাকিবের জন্য কোনটি সঠিক পদক্ষেপ হিসেবে উঠে এসেছে?",
  "লিসার কথা অনুযায়ী রাকিবের জন্য সঠিক সিদ্ধান্ত কোনটি?"
];

const lp7mcqVariations = [
  "নিচের কোন অভ্যাসটি সম্পূর্ণ বর্জন করা উচিত?",
  "ভালো ফলাফল পেতে নিচের কোন অভ্যাসটি বর্জন করা বাধ্যতামূলক?",
  "নিচের কোন নেতিবাচক অভ্যাসটি পরিহার করা উচিত?",
  "নিচের কোন কাজটি বর্জন করা বাধ্যতামূলক?"
];

const lp8checkmarkVariations = [
  "নিচের কোন বিষয়গুলো আমাদের পরিহার বা বর্জন করা উচিত? (সবগুলো সিলেক্ট করুন)",
  "সাধারণ ভুল এড়াতে কোন কাজগুলো পরিহার করা আবশ্যক? (সবগুলো সিলেক্ট করুন)",
  "নিচের কোন ভুলগুলো পরিহার করা উচিত? (সবগুলো সিলেক্ট করুন)",
  "নিচের কোন অসচেতন পদক্ষেপগুলো বর্জন করা উচিত? (সবগুলো সিলেক্ট করুন)"
];

function getDeterministicVariation(id, variations) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash += id.charCodeAt(i);
  }
  return variations[hash % variations.length];
}

console.log('🧹 Cleaning repetitive chapter prefixes from questions...');

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
                const lpId = lp.id;
                let newText = oldText;

                // 1. MCQ (LP 1)
                if (/নি(য়|য)ে নিচের কোন তথ্যটি সঠিক\?$/.test(oldText)) {
                  newText = getDeterministicVariation(lpId, mcqVariations);
                }
                // 2. Checkmark (LP 3)
                else if (/সংক্রান্ত সঠিক( ও নিরাপদ)? পদক্ষেপগুলো সিলেক্ট করুন: \(সবগুলো সিলেক্ট করুন\)$/.test(oldText)) {
                  newText = getDeterministicVariation(lpId, checkmarkVariations);
                }
                // 3. Matching (LP 4)
                else if (/সম্পর্কিত উপাদানগুলোর সঠিক মিল করুন:$/.test(oldText)) {
                  newText = getDeterministicVariation(lpId, matchingVariations);
                }
                // 4. Storytelling (LP 5)
                else if (/এর ক্ষেত্রে রাকিবের জন্য কোনটি সঠিক পদক্ষেপ হবে\?$/.test(oldText)) {
                  newText = getDeterministicVariation(lpId, storytellingVariations);
                }
                // 5. MCQ (LP 7)
                else if (/এ (ভালো ফল পাওয়ার|অ্যাকাউন্ট সুরক্ষিত রাখার) জন্য নিচের কোন অভ্যাসটি বর্জন করা বাধ্যতামুলক\?$/.test(oldText)) {
                  newText = getDeterministicVariation(lpId, lp7mcqVariations);
                }
                // 6. Checkmark (LP 8)
                else if (/এর সময় কোন বিষয়গুলো পরিহার করা উচিত\? \(সবগুলো সিলেক্ট করুন\)$/.test(oldText)) {
                  newText = getDeterministicVariation(lpId, lp8checkmarkVariations);
                }

                if (newText !== oldText) {
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
    console.log(`✓ Cleaned ${cleanCount} question prefixes in this file.`);
  } else {
    console.log(`✓ No matching prefixes found.`);
  }
}

console.log('✨ All files processed and saved successfully!');
