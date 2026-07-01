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

const wordReplacements = [
  { search: /प्रतिनिधियों/g, replace: 'প্রতিনিধিদের' },
  { search: /समस्याओं/g, replace: 'সমস্যার' },
  { search: /वस्तू/g, replace: 'বস্তু' }
];

const customMappings = {
  '\u0935': '\u09ac', // व -> ব
  '\u0949': ''        // ॉ -> empty
};

function mapChar(char) {
  if (customMappings[char] !== undefined) {
    return customMappings[char];
  }
  const code = char.charCodeAt(0);
  if (code >= 0x0900 && code <= 0x097F) {
    // Keep Dari punctuation (। is 0x0964, ॥ is 0x0965) unchanged
    if (code === 0x0964 || code === 0x0965) {
      return char;
    }
    // Shift code to Bengali block
    return String.fromCharCode(code + 0x80);
  }
  return char;
}

console.log('🧹 Cleaning Devanagari characters from all courses...');

for (const filePath of filePaths) {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping: File not found at ${filePath}`);
    continue;
  }

  console.log(`Processing file: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Run specific word replacements
  for (const item of wordReplacements) {
    content = content.replace(item.search, item.replace);
  }

  // 2. Map other Devanagari characters to Bengali block
  let mappedContent = '';
  for (let i = 0; i < content.length; i++) {
    mappedContent += mapChar(content[i]);
  }

  // 3. Verify it is valid JSON
  try {
    const parsed = JSON.parse(mappedContent);
    // Write back pretty printed
    fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf-8');
    console.log(`✓ Successfully cleaned and updated: ${filePath}`);
  } catch (err) {
    console.error(`❌ Error parsing JSON after mapping for ${filePath}:`, err.message);
  }
}

console.log('✨ All files cleaned successfully!');
