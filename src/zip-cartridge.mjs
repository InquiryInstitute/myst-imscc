import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

async function addDir(zip, absDir, zipPrefix = '') {
  const entries = await fs.readdir(absDir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(absDir, e.name);
    const rel = zipPrefix ? `${zipPrefix}/${e.name}` : e.name;
    if (e.isDirectory()) await addDir(zip, abs, rel);
    else zip.file(rel.replace(/\\/g, '/'), await fs.readFile(abs));
  }
}

/**
 * Zip a cartridge root folder (contains imsmanifest.xml + web_resources/…).
 * @param {string} cartridgeRoot
 * @param {string} outZipPath
 */
export async function zipCartridgeFolder(cartridgeRoot, outZipPath) {
  const zip = new JSZip();
  await addDir(zip, cartridgeRoot, '');
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  await fs.mkdir(path.dirname(outZipPath), { recursive: true });
  await fs.writeFile(outZipPath, buf);
}
