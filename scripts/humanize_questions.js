/* global process */
import fs from 'fs';
import path from 'path';

const filePaths = [
  path.join(process.cwd(), 'database', 'courses', 'bangladesh_labor_law_2006.json'),
  path.join(process.cwd(), 'database', 'courses', 'cyber_threat_and_scam.json'),
  path.join(process.cwd(), 'database', 'courses', 'password_and_account_security.json'),
  path.join(process.cwd(), 'database', 'courses', 'cyberbullying_and_harassment.json'),
  path.join(process.cwd(), 'database', 'courses', 'productivity_and_time_management.json'),
  path.join(process.cwd(), 'database', 'courses', 'ict_class_11_12.json'),
  path.join(process.cwd(), 'scratch', 'cv_course_backup.json'),
  path.join(process.cwd(), 'scratch', 'cyber_course_backup.json'),
  path.join(process.cwd(), 'scratch', 'password_and_account_security_backup.json'),
  path.join(process.cwd(), 'scratch', 'cyberbullying_and_harassment_backup.json'),
  path.join(process.cwd(), 'scratch', 'productivity_and_time_management_backup.json'),
  path.join(process.cwd(), 'scratch', 'ict_class_11_12_backup.json')
];

const mcqVariations = [
  "আসুন একটু মগজ ধোলাই করি! নিচের কোন তথ্যটি ১০০% খাঁটি?",
  "নিচের কোন তথ্যটি একদম সঠিক বলে আপনার বিবেক বলে?",
  "একটু বুদ্ধি খাটিয়ে বলুন তো, নিচের কোন উক্তিটি সঠিক?",
  "এখানে একটি পরম সত্য লুকিয়ে আছে, খুঁজে বের করুন তো!"
];

const checkmarkVariations = [
  "নিচের কোন পদক্ষেপগুলো বুদ্ধিমানের মতো এবং নিরাপদ? সঠিকগুলো বেছে নিন",
  "বিপদের হাত থেকে বাঁচতে নিচের কোন কোন পদক্ষেপ নেওয়া উচিত বলুন তো?",
  "এখানে কোন কোন কাজগুলো করা একদম সঠিক ও নিরাপদ মনে হচ্ছে?",
  "স্মার্ট ও নিরাপদ থাকতে নিচের কোন অপশনগুলো সিলেক্ট করবেন?"
];

const matchingVariations = [
  "এলোমেলো জোড়াগুলোকে একটু মিলিয়ে দিন তো, দেখি কেমন পারেন!",
  "বাম পাশের সাথে ডান পাশের সঠিক জুটি মিলিয়ে দিন:",
  "নিচের কলাম দুটির মধ্যে সঠিক মিলগুলো খুঁজে বের করুন:",
  "আসুন একটা ম্যাচ-মেকিং গেম খেলি! সঠিক জোড়াগুলো মেলান:"
];

const storytellingVariations = [
  "রাকিব তো প্রায় ভুল করতেই যাচ্ছিল! লিসার বুদ্ধিমত্তার উপর ভিত্তি করে রাকিবের এখন কী করা উচিত?",
  "লিসার বকা খাওয়ার পর রাকিবের সঠিক শিক্ষা কোনটা হওয়া উচিত বলুন তো?",
  "রাকিবের এই পরিস্থিতি থেকে বাঁচার জন্য লিসা কী বুদ্ধিমান সমাধান দিল?",
  "লিসার পরামর্শ অনুযায়ী রাকিবের সঠিক পদক্ষেপ কোনটি?"
];

const lp7mcqVariations = [
  "নিচের কোন অভ্যাসটি সম্পূর্ণ বর্জন করা উচিত?",
  "ভালো ফলাফল পেতে নিচের কোন অভ্যাসটি বর্জন করা বাধ্যতামূলক?",
  "নিচের কোন নেতিবাচক অভ্যাসটি পরিহার করা উচিত?",
  "নিচের কোন কাজটি বর্জন করা বাধ্যতামূলক?"
];

const lp8checkmarkVariations = [
  "নিচের কোন ভুলগুলো করলে একদম মাথায় হাত পড়বে? সেগুলো বেছে নিন",
  "বিপদে পড়তে না চাইলে কোন কোন কাজ করা একদমই উচিত নয়?",
  "নিচের কোন ভুল পদক্ষেপগুলো আমাদের দ্রুত পরিহার করা উচিত?",
  "কোন কোন কাজগুলো করলে আপনার কপাল পুড়তে পারে? সেগুলো সিলেক্ট করুন"
];

const oldPrefixes = [
  "ঠিক ধরেছেন! ",
  "একদম স্পট অন! ",
  "সহজ কথায় বলতে গেলে, ",
  "বুদ্ধিমানের মতো সিদ্ধান্ত! ",
  "মনে রাখবেন, ",
  "আরে বাহ! একদম সঠিক উত্তর। ",
  "কাকতালীয় নয়, এটাই বৈজ্ঞানিকভাবে প্রমাণিত যে, ",
  "হ্যাঁ, এটাই আসল রহস্য: ",
  "ভুল হওয়ার কোনো চান্সই নেই, কারণ— ",
  "ডিজিটাল লাইফে এই বিষয়টি জানা লাইফ-সেভিং! কারণ, "
];

const explanationPrefixes = [
  "ঠিক ধরেছেন! ",
  "একদম স্পট অন! ",
  "সহজ কথায় বলতে গেলে, ",
  "বুদ্ধিমানের মতো উত্তর! ",
  "মনে রাখবেন, ",
  "আরে বাহ! একদম সঠিক উত্তর। ",
  "বাস্তবে কিন্তু এটাই সত্য, কারণ— ",
  "হ্যাঁ, এটাই আসল রহস্য: ",
  "ভুল হওয়ার কোনো চান্সই নেই, কারণ— ",
  "এই গুরুত্বপূর্ণ বিষয়টি সবারই জেনে রাখা উচিত, কারণ: "
];

function getDeterministicVariation(id, variations) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash += id.charCodeAt(i);
  }
  return variations[hash % variations.length];
}

console.log('🎭 Humanizing and adding humor to questions and hints...');

for (const filePath of filePaths) {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping: File not found at ${filePath}`);
    continue;
  }

  console.log(`Processing file: ${filePath}`);
  const courseData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let qCount = 0;
  let expCount = 0;

  if (courseData.units) {
    courseData.units.forEach(unit => {
      if (unit.chapters) {
        unit.chapters.forEach(chapter => {
          if (chapter.learning_points) {
            chapter.learning_points.forEach(lp => {
              if (lp.mcq_questions && lp.mcq_questions[0]) {
                const q = lp.mcq_questions[0];
                const oldText = q.question_text || '';
                const oldExp = q.explanation || '';
                const lpId = lp.id;
                let newText = oldText;

                // 1. MCQ (LP 1)
                if (
                  /নি(য়|য)ে নিচের কোন তথ্যটি সঠিক\?$/.test(oldText) ||
                  /^নিচের কোন (তথ্যটি|বিবরণটি|উক্তিটি) সঠিক\?$/.test(oldText) ||
                  /^নিচের সঠিক তথ্যটি চিহ্নিত করুন:$/.test(oldText)
                ) {
                  newText = getDeterministicVariation(lpId, mcqVariations);
                }
                // 2. Checkmark (LP 3)
                else if (
                  /সংক্রান্ত সঠিক( ও নিরাপদ)? পদক্ষেপগুলো সিলেক্ট করুন$/.test(oldText) ||
                  /^নিচের কোন পদক্ষেপগুলো সঠিক ও নিরাপদ\?$/.test(oldText) ||
                  /^সঠিক ও নিরাপদ পদক্ষেপগুলো নির্বাচন করুন:$/.test(oldText) ||
                  /^নিচের কোন বিকল্পগুলো সঠিক পদক্ষেপ নির্দেশ করে\?$/.test(oldText) ||
                  /^নিচের কোনগুলো সঠিক পদক্ষেপ\?$/.test(oldText)
                ) {
                  newText = getDeterministicVariation(lpId, checkmarkVariations);
                }
                // 3. Matching (LP 4)
                else if (
                  /সম্পর্কিত উপাদানগুলোর সঠিক মিল করুন:$/.test(oldText) ||
                  /^বাম পাশের তথ্যের সাথে ডান পাশের তথ্যের সঠিক মিল করুন:$/.test(oldText) ||
                  /^নিচের উপাদানগুলোর সঠিক মিল করুন:$/.test(oldText) ||
                  /^সঠিক জোড়াগুলো মেলান:$/.test(oldText) ||
                  /^বাম ও ডান কলামের সঠিক মিল করুন:$/.test(oldText)
                ) {
                  newText = getDeterministicVariation(lpId, matchingVariations);
                }
                // 4. Storytelling (LP 5)
                else if (
                  /এর ক্ষেত্রে (রাকিবের জন্য )?কোনটি সঠিক পদক্ষেপ হবে\?$/.test(oldText) ||
                  /^লিসার কথা অনুযা(য়ী|ই|য়ী|ই),? রাকিবের জন্য কোনটি সঠিক পদক্ষেপ হবে\?$/.test(oldText) ||
                  /^লিসার পরামর্শ অনুযায়ী রাকিবের কী করা উচিত\?$/.test(oldText) ||
                  /^লিসার বক্তব্য থেকে রাকিবের জন্য কোনটি সঠিক পদক্ষেপ হিসেবে উঠে এসেছে\?$/.test(oldText) ||
                  /^লিসার কথা অনুযায়ী রাকিবের জন্য সঠিক সিদ্ধান্ত কোনটি\?$/.test(oldText)
                ) {
                  newText = getDeterministicVariation(lpId, storytellingVariations);
                }
                // 5. MCQ (LP 7)
                else if (
                  /এ (ভালো ফল পাওয়ার|অ্যাকাউন্ট সুরক্ষিত রাখার) জন্য নিচের কোন অভ্যাসটি বর্জন করা বাধ্যতামুলক\?$/.test(oldText) ||
                  /^নিচের কোন অভ্যাসটি সম্পূর্ণ বর্জন করা উচিত\?$/.test(oldText) ||
                  /^ভালো ফলাফল পেতে নিচের কোন অভ্যাসটি বর্জন করা বাধ্যতামূলক\?$/.test(oldText) ||
                  /^নিচের কোন নেতিবাচক অভ্যাসটি পরিহার করা উচিত\?$/.test(oldText) ||
                  /^নিচের কোন কাজটি বর্জন করা বাধ্যতামূলক\?$/.test(oldText)
                ) {
                  newText = getDeterministicVariation(lpId, lp7mcqVariations);
                }
                // 6. Checkmark (LP 8)
                else if (
                  /এর সময় কোন বিষয়গুলো পরিহার করা উচিত$/.test(oldText) ||
                  /^নিচের কোন বিষয়গুলো আমাদের পরিহার বা বর্জন করা উচিত\?$/.test(oldText) ||
                  /^সাধারণ ভুল এড়াতে কোন কাজগুলো পরিহার করা আবশ্যক\?$/.test(oldText) ||
                  /^নিচের কোন ভুলগুলো পরিহার করা উচিত\?$/.test(oldText) ||
                  /^নিচের কোন অসচেতন পদক্ষেপগুলো বর্জন করা উচিত\?$/.test(oldText)
                ) {
                  newText = getDeterministicVariation(lpId, lp8checkmarkVariations);
                }

                if (newText !== oldText) {
                  q.question_text = newText;
                  qCount++;
                }

                // Strip old prefix if present (loop to remove duplicates)
                let cleanExp = oldExp;
                const allPrefixes = Array.from(new Set([...oldPrefixes, ...explanationPrefixes]));
                let found = true;
                while (found) {
                  found = false;
                  for (const oldPrefix of allPrefixes) {
                    if (cleanExp.startsWith(oldPrefix)) {
                      cleanExp = cleanExp.substring(oldPrefix.length);
                      found = true;
                      break;
                    }
                  }
                }

                // Prepend new explanationPrefixes
                if (cleanExp.trim().length > 0) {
                  const prefix = getDeterministicVariation(lpId, explanationPrefixes);
                  const newExp = prefix + cleanExp;
                  if (newExp !== oldExp) {
                    q.explanation = newExp;
                    expCount++;
                  }
                }
              }
            });
          }
        });
      }
    });
  }

  if (qCount > 0 || expCount > 0) {
    fs.writeFileSync(filePath, JSON.stringify(courseData, null, 2), 'utf-8');
    console.log(`✓ Humanized ${qCount} questions and ${expCount} explanations in this file.`);
  } else {
    console.log(`✓ No changes needed.`);
  }
}

console.log('✨ All files processed successfully!');
