const fs = require('fs');
const path = require('path');

const packageJsonPath = './extension/package.json';
const root = path.resolve(__dirname, '../../');
const extensionDir = path.resolve(root, 'extension');
const packageNlsJsonPaths = ['package.nls.json', 'package.nls.de.json'];

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const packageNlsJsons = packageNlsJsonPaths.map((file) => {
  return JSON.parse(fs.readFileSync(path.resolve(extensionDir, file), 'utf8'));
});

const contributes = packageJson.contributes || {};

let err = false;

/**
 *
 * @param {string} what
 */
function getTranslationKeys(what) {
  const pattern = /%([^%]+)%/g;
  return Array.from(what.matchAll(pattern), (match) => match[1]);
}

/**
 *
 * @param {{[key: string]: unknown}} what
 */
function checkTranslationsRecursive(what) {
  for (const key in what) {
    const value = what[key];
    if (typeof value === 'string') {
      const translationKeys = getTranslationKeys(value);
      for (const translationKey of translationKeys) {
        for (const packageNlsJson of packageNlsJsons) {
          if (!packageNlsJson.hasOwnProperty(translationKey)) {
            console.error(
              `Missing translation for key: ${translationKey} in ${packageNlsJsonPaths[packageNlsJsons.indexOf(packageNlsJson)]}`,
            );
            err = true;
          }
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      checkTranslationsRecursive(value);
    }
  }
}

checkTranslationsRecursive(contributes);

if (err) {
  console.error('Translation check failed. Please add missing translations.');
  process.exit(1);
}
