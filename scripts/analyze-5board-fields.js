// script for inspecting legacy .5board element fields, not used by extension runtime

const fs = require('fs');
const path = require('path');

const folder = process.argv[2];

if (!folder) {
  console.error('Usage: node scripts/analyze-5board-fields.js <folder>');
  process.exit(1);
}

const stats = new Map();
const counts = new Map();

// returns json-type of a value
function jsonType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

// creates new entry in stats & counts for each element type
function ensureType(type) {
  if (!stats.has(type)) stats.set(type, new Map());
  if (!counts.has(type)) counts.set(type, 0);
}

// analyzes a single element
function analyzeObject(object) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return;

  const type = typeof object.type === 'string' ? object.type : '<missing>';
  ensureType(type);
  counts.set(type, counts.get(type) + 1);

  const fields = stats.get(type);

  for (const [key, value] of Object.entries(object)) {
    if (!fields.has(key)) fields.set(key, new Set());
    fields.get(key).add(jsonType(value));
  }

  // for group elements -> recursion
  if (Array.isArray(object.objects)) {
    for (const child of object.objects) {
      analyzeObject(child);
    }
  }
}

// Goes through all folders and subfolders
function checkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // checks subfolders -> recursion
    if (entry.isDirectory()) {
      checkFiles(fullPath);
      continue;
    }

    if (!entry.name.endsWith('.5board')) continue;

    try {
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const objects = data?.content?.objects;

      if (!Array.isArray(objects)) {
        console.warn(`WARN: no content.objects array in ${fullPath}`);
        continue;
      }

      for (const object of objects) {
        analyzeObject(object);
      }
    } catch (error) {
      console.warn(`WARN: could not read ${fullPath}: ${error.message}`);
    }
  }
}

// start of script
checkFiles(folder);

for (const type of [...stats.keys()].sort()) {
  console.log(`\n## ${type} (${counts.get(type)})`);

  const fields = stats.get(type);
  for (const key of [...fields.keys()].sort()) {
    const types = [...fields.get(key)].sort().join(' | ');
    console.log(`${key}: ${types}`);
  }
}
