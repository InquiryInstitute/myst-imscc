import fs from 'node:fs/promises';
import path from 'node:path';
import { applyVariantBlocks } from './preprocess-variant.mjs';
const TEXT_EXT = new Set(['.md', '.myst', '.yml', '.yaml', '.json', '.txt', '.css', '.html']);

async function copyTreeProcess(src, dest, variant, processText) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.name === 'node_modules' || e.name === '_build') continue;
    if (e.isDirectory()) await copyTreeProcess(s, d, variant, processText);
    else {
      const ext = path.extname(e.name).toLowerCase();
      if (processText && TEXT_EXT.has(ext)) {
        const raw = await fs.readFile(s, 'utf8');
        const out = applyVariantBlocks(raw, variant);
        await fs.writeFile(d, out, 'utf8');
      } else {
        await fs.copyFile(s, d);
      }
    }
  }
}

/**
 * Copy MyST project to a build directory, applying variant block preprocessing to text files.
 * @param {string} mystProjectDir
 * @param {string} outDir
 * @param {string} variant
 */
export async function prepareMystProjectDir(mystProjectDir, outDir, variant) {
  await fs.rm(outDir, { recursive: true, force: true });
  await copyTreeProcess(path.resolve(mystProjectDir), outDir, variant, true);
}
