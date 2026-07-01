import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'scratch', 'cv_course_backup.json');

if (!fs.existsSync(filePath)) {
  console.error(`Error: File not found at ${filePath}`);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf-8');

const replacements = [
  { search: /নিজের ডিসপ্লে নেম বা কোনো স্টাইলিশ ফন্ট।/g, replace: 'নিজের ডাকনাম বা কোনো অলংকারিক ফন্ট।' },
  { search: /সানগ্লাস বা মাথায় স্টাইলিশ ক্যাপ\/টুপি পরে ছবি তোলা।/g, replace: 'সানগ্লাস বা মাথায় ক্যাপ/টুপি পরে ছবি তোলা।' },
  { search: /বা স্টাইলিশ সেলফি সিভিতে ব্যবহার/g, replace: 'বা ক্যাজুয়াল সেলফি সিভিতে ব্যবহার' },
  { search: /কোনো party বা বিয়ে বাড়িতে তোলা স্টাইলিশ ক্যাজুয়াল ছবি।/g, replace: 'কোনো party বা বিয়ে বাড়িতে তোলা ক্যাজুয়াল ছবি।' },
  { search: /দক্ষতাগুলোর পাশে স্টাইলিশ ইমোজি যুক্ত করা/g, replace: 'দক্ষতাগুলোর পাশে অপ্রাসঙ্গিক ইমোজি যুক্ত করা' },
  { search: /একটু স্টাইলিশ বা কার্সিভ ফন্ট/g, replace: 'একটু অলংকারিক বা কার্সিভ ফন্ট' },
  { search: /কার্সিভ স্টাইলের ফন্ট/g, replace: 'কার্সিভ ধরনের ফন্ট' },
  { search: /টেবিল বর্ডার স্টাইল/g, replace: 'টেবিল বর্ডার ডিজাইন' },
  { search: /ফন্ট স্টাইল/g, replace: 'ফন্টের ধরন' },
  { search: /কাজের স্টাইল/g, replace: 'কাজের ধরন' }
];

console.log('🧹 Replacing the word "স্টাইল" in CV course...');

let modified = content;
for (const r of replacements) {
  const count = (modified.match(r.search) || []).length;
  modified = modified.replace(r.search, r.replace);
  console.log(`- Replaced "${r.search.source}" -> "${r.replace}" (${count} occurrences)`);
}

// Check if any "স্টাইল" is left
const remaining = [];
const lines = modified.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('স্টাইল')) {
    remaining.push(`${idx + 1}: ${line.trim()}`);
  }
});

if (remaining.length > 0) {
  console.log('⚠️ Remaining instances of "স্টাইল":');
  remaining.forEach(line => console.log(line));
} else {
  console.log('✨ No instances of "স্টাইল" left in the file!');
}

try {
  // Validate JSON
  const parsed = JSON.parse(modified);
  fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf-8');
  console.log('✓ Successfully wrote modified JSON back to file!');
} catch (err) {
  console.error('❌ Failed to parse/write JSON:', err.message);
}
