/**
 * compile_cyber_course.js
 * ========================
 * Compiles the full "Cyber Threat & Scam" course from all source data files.
 * Converts the simplified `lps` (learning points) format into the proper
 * Supabase DB schema (learning_points -> mcq_questions -> mcq_options / metadata).
 * Also strips unprofessional prefixes from question_text.
 *
 * Run: node scripts/compile_cyber_course.js
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Import all unit data sources
import { unitsData } from './generate_cyber_course_v2.js';     // Unit 1 (8 ch)
import { remainingUnits } from './generate_cyber_course_v2.js'; // Unit 2 (8 ch) + Unit 3 (first 2 ch)
import { unit3Chapters } from './data_unit3.js';                // Unit 3 remaining 6 ch
import { unit4Chapters } from './data_unit4.js';                // Unit 4 (8 ch)
import { unit5Chapters } from './data_unit5.js';                // Unit 5 (8 ch)
import { unit6Chapters } from './data_unit6.js';                // Unit 6 (6 ch)

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

// ─── Helper: strip unprofessional chapter-title prefixes from question text ───
// Removes patterns like: "চ্যাপ্টার টাইটেল এর ক্ষেত্রে..." or anything inside "..." quotes
// followed by a Bengali connective suffix.
const CLEAN_PREFIXES_REGEX = [
  /^"[^"]+"\s*(এর ক্ষেত্রে\s*|বিষয়ে সচেতন থাকলে\s*|সম্পর্কে\s*)/u,
  /^'[^']+'\s*(এর ক্ষেত্রে\s*|বিষয়ে সচেতন থাকলে\s*|সম্পর্কে\s*)/u,
];

function cleanQuestionText(text) {
  if (!text) return text;
  let cleaned = text.trim();
  for (const rx of CLEAN_PREFIXES_REGEX) {
    cleaned = cleaned.replace(rx, '');
  }
  // Capitalize first char if it got stripped
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned.trim();
}

// ─── Helper: shuffle array (Fisher-Yates) ─────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Core converter: lp definition → DB learning_point object ─────────────────
function convertLp(lp, chapterId, orderIndex) {
  const lpId = uid();
  const qId = uid();
  const createdAt = now();

  const questionText = cleanQuestionText(lp.qText);

  // Build mcq_options (for mcq, boolean, checkmark, storytelling)
  let mcqOptions = [];
  let metadata = {};
  let narrative = null;
  let questionType = lp.qType;

  if (lp.qType === 'matching') {
    // Matching: options are empty, pairs go into metadata
    mcqOptions = [];
    metadata = {
      pairs: lp.pairs.map(p => ({ left: p.left, right: p.right }))
    };
  } else {
    // All other types: shuffle options, assign order_index
    const shuffledOpts = shuffle(lp.options || []);
    mcqOptions = shuffledOpts.map((opt, idx) => ({
      id: uid(),
      question_id: qId,
      option_text: opt.text,
      is_correct: opt.is_correct,
      order_index: idx + 1,
      created_at: createdAt
    }));

    // For storytelling: store answer_type and narrative in metadata/narrative field
    if (lp.qType === 'storytelling') {
      metadata = { answer_type: lp.answer_type || 'mcq' };
      narrative = JSON.stringify(lp.narrative || []);
    }
  }

  const question = {
    id: qId,
    learning_point_id: lpId,
    question_text: questionText,
    explanation: lp.explanation || '',
    order_index: 1,
    created_at: createdAt,
    narrative: narrative,
    question_type: questionType,
    metadata: Object.keys(metadata).length > 0 ? metadata : null,
    mcq_options: mcqOptions
  };

  return {
    id: lpId,
    chapter_id: chapterId,
    title: lp.title,
    content: lp.content,
    order_index: orderIndex,
    created_at: createdAt,
    type: 'quiz',
    mcq_questions: [question]
  };
}

// ─── Convert a chapter definition (with lps array) → DB chapter object ────────
function convertChapter(ch, unitId, orderIndex) {
  const chapterId = uid();
  const createdAt = now();

  const learningPoints = (ch.lps || []).map((lp, lpIdx) =>
    convertLp(lp, chapterId, lpIdx + 1)
  );

  return {
    id: chapterId,
    unit_id: unitId,
    title: ch.title,
    order_index: orderIndex,
    created_at: createdAt,
    learning_points: learningPoints
  };
}

// ─── Convert a unit definition (with chapters array) → DB unit object ─────────
function convertUnit(unitDef, courseId, orderIndex) {
  const unitId = uid();
  const createdAt = now();

  const chapters = (unitDef.chapters || []).map((ch, chIdx) =>
    convertChapter(ch, unitId, chIdx + 1)
  );

  return {
    id: unitId,
    course_id: courseId,
    title: unitDef.title,
    order_index: orderIndex,
    created_at: createdAt,
    chapters: chapters
  };
}

// ─── Main: assemble the full 6-unit structure ─────────────────────────────────
function main() {
  console.log('🚀 Compiling Cyber Threat & Scam course...\n');

  // Read existing course metadata from the current JSON to preserve IDs etc.
  const existingPath = path.join(process.cwd(), 'database', 'courses', 'cyber_threat_and_scam.json');
  const existing = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));

  const courseId = existing.id; // keep the live course ID

  // ── Assemble all 6 units ────────────────────────────────────────────────────
  // Unit 1: from unitsData[0] (8 chapters)
  const unit1Def = { title: unitsData[0].title, chapters: unitsData[0].chapters };

  // Unit 2: from remainingUnits[0] (8 chapters)
  const unit2Def = { title: remainingUnits[0].title, chapters: remainingUnits[0].chapters };

  // Unit 3: remainingUnits[1] has 2 chapters, unit3Chapters has 6 more = 8 total
  const unit3Def = {
    title: remainingUnits[1].title,
    chapters: [...remainingUnits[1].chapters, ...unit3Chapters]
  };

  // Unit 4: from unit4Chapters (8 chapters)
  const unit4Def = { title: 'ম্যালওয়্যার, ভাইরাস ও র‍্যানসমওয়্যার', chapters: unit4Chapters };

  // Unit 5: from unit5Chapters (8 chapters)
  const unit5Def = { title: 'পাসওয়ার্ড ও অ্যাকাউন্ট নিরাপত্তা', chapters: unit5Chapters };

  // Unit 6: from unit6Chapters (6 chapters)
  const unit6Def = { title: 'শিশু ও পরিবারের সাইবার নিরাপত্তা', chapters: unit6Chapters };

  const unitDefs = [unit1Def, unit2Def, unit3Def, unit4Def, unit5Def, unit6Def];

  const units = unitDefs.map((def, i) => convertUnit(def, courseId, i + 1));

  // ── Print summary ────────────────────────────────────────────────────────────
  units.forEach((u, ui) => {
    const lpCount = u.chapters.reduce((sum, c) => sum + c.learning_points.length, 0);
    const qCount = u.chapters.reduce((sum, c) =>
      sum + c.learning_points.reduce((s2, lp) => s2 + lp.mcq_questions.length, 0), 0);
    console.log(`Unit ${ui + 1}: "${u.title}"`);
    console.log(`  Chapters: ${u.chapters.length} | LPs: ${lpCount} | Questions: ${qCount}`);
    u.chapters.forEach((c, ci) => {
      console.log(`    Ch${ci + 1}: "${c.title}" (${c.learning_points.length} LPs)`);
    });
    console.log('');
  });

  // ── Build final course object ────────────────────────────────────────────────
  const courseData = {
    ...existing,
    units
  };
  delete courseData.units; // rebuild below
  courseData.units = units;

  const finalJson = JSON.stringify(courseData, null, 2);

  // ── Write to both locations ──────────────────────────────────────────────────
  const scratchPath = path.join(process.cwd(), 'scratch', 'cyber_course_backup.json');
  const dbPath = path.join(process.cwd(), 'database', 'courses', 'cyber_threat_and_scam.json');

  fs.writeFileSync(scratchPath, finalJson, 'utf-8');
  fs.writeFileSync(dbPath, finalJson, 'utf-8');

  console.log('✅ Course compiled successfully!');
  console.log(`   → scratch/cyber_course_backup.json`);
  console.log(`   → database/courses/cyber_threat_and_scam.json`);

  // ── Validate: check for any remaining placeholder text ───────────────────────
  let phCount = 0;
  units.forEach(u => {
    u.chapters.forEach(c => {
      c.learning_points.forEach(lp => {
        if (lp.content?.includes('বিস্তারিত জানব') || lp.content?.includes('টপিক')) phCount++;
        lp.mcq_questions.forEach(q => {
          if (q.question_text?.includes(c.title)) phCount++;
        });
      });
    });
  });
  if (phCount > 0) {
    console.warn(`\n⚠️  WARNING: ${phCount} possible placeholder texts remaining. Please review.`);
  } else {
    console.log('\n✅ Validation: 0 placeholder texts detected. Course is clean!');
  }

  const totalChapters = units.reduce((s, u) => s + u.chapters.length, 0);
  const totalLPs = units.reduce((s, u) =>
    s + u.chapters.reduce((s2, c) => s2 + c.learning_points.length, 0), 0);
  const totalQs = units.reduce((s, u) =>
    s + u.chapters.reduce((s2, c) =>
      s2 + c.learning_points.reduce((s3, lp) => s3 + lp.mcq_questions.length, 0), 0), 0);

  console.log(`\n📊 Final Stats:`);
  console.log(`   Units: ${units.length}`);
  console.log(`   Chapters: ${totalChapters}`);
  console.log(`   Learning Points: ${totalLPs}`);
  console.log(`   Questions: ${totalQs}`);
}

main();
