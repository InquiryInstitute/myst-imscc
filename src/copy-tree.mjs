import fs from 'node:fs/promises';
import path from 'node:path';

export async function copyTree(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const stat = await fs.stat(src);
  if (!stat.isDirectory()) {
    await fs.copyFile(src, dest);
    return;
  }
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) await copyTree(s, d);
    else await fs.copyFile(s, d);
  }
}
