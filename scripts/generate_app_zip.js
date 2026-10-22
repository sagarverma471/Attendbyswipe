import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_ZIP_PATH = path.resolve(ROOT_DIR, 'public', 'SwipeAttend-App.zip');

const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  'dev-dist',
  '.git',
  '.aistudio',
]);

const EXCLUDED_FILES = new Set([
  'SwipeAttend-App.zip',
  'bun.lock',
  'test-mount.ts',
]);

function shouldInclude(filePath, relativePath) {
  const parts = relativePath.split(path.sep);
  for (const part of parts) {
    if (EXCLUDED_DIRS.has(part)) return false;
    if (part.startsWith('.') && part !== '.env.example' && part !== '.gitignore') return false;
  }
  const baseName = path.basename(filePath);
  if (EXCLUDED_FILES.has(baseName)) return false;
  if (baseName.endsWith('.zip')) return false;
  return true;
}

function collectFiles(dir, baseDir = ROOT_DIR) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      if (shouldInclude(fullPath, relPath)) {
        results.push(...collectFiles(fullPath, baseDir));
      }
    } else if (entry.isFile()) {
      if (shouldInclude(fullPath, relPath)) {
        results.push({ fullPath, relPath });
      }
    }
  }

  return results;
}

async function buildZip() {
  console.log('Packaging SwipeAttend application into downloadable ZIP...');
  const zip = new JSZip();
  const files = collectFiles(ROOT_DIR);

  console.log(`Found ${files.length} application files to package.`);

  for (const { fullPath, relPath } of files) {
    const content = fs.readFileSync(fullPath);
    // Standardize zip file paths with forward slash
    const zipPath = 'SwipeAttend-App/' + relPath.split(path.sep).join('/');
    zip.file(zipPath, content);
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  fs.writeFileSync(OUTPUT_ZIP_PATH, zipBuffer);
  const sizeMB = (zipBuffer.length / (1024 * 1024)).toFixed(2);
  console.log(`Successfully generated ${OUTPUT_ZIP_PATH} (${sizeMB} MB, ${files.length} files)`);
}

buildZip().catch((err) => {
  console.error('Error generating app zip:', err);
  process.exit(1);
});
