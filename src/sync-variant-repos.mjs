import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { copyTree } from './copy-tree.mjs';

/**
 * Remove all children of `repoDir` except `.git`.
 * @param {string} repoDir
 */
export async function wipeWorkingTreeExceptGit(repoDir) {
  const entries = await fs.readdir(repoDir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === '.git') continue;
    await fs.rm(path.join(repoDir, e.name), { recursive: true, force: true });
  }
}

/**
 * Copy built artifacts into a variant repository working tree.
 * @param {object} o
 * @param {string} o.repoDir — Absolute path to clone (e.g. ../aima-basic)
 * @param {string} o.docsDir — Built GitHub Pages tree (e.g. .../docs)
 * @param {string} [o.imsccFile] — Path to course.imscc zip
 * @param {string} [o.readme]
 */
export async function copyArtifactsToVariantRepo(o) {
  const { repoDir, docsDir, imsccFile, readme } = o;
  await fs.mkdir(path.join(repoDir, 'docs'), { recursive: true });
  await copyTree(docsDir, path.join(repoDir, 'docs'));
  if (imsccFile) {
    // GitHub rejects blobs >100MB; IMS CC with embedded Reveal/audio can exceed that — use Git LFS.
    await fs.writeFile(
      path.join(repoDir, '.gitattributes'),
      '*.imscc filter=lfs diff=lfs merge=lfs -text\n',
      'utf8'
    );
    await fs.copyFile(imsccFile, path.join(repoDir, 'course.imscc'));
  }
  if (readme) {
    await fs.writeFile(path.join(repoDir, 'README.md'), readme, 'utf8');
  }
}

/**
 * git add -A && git commit && git push (optional).
 * @param {string} repoDir
 * @param {string} message
 * @param {{ push?: boolean, remote?: string, branch?: string }} [opts]
 */
export function gitCommitAndPush(repoDir, message, opts = {}) {
  const { push = false, remote = 'origin', branch = 'main' } = opts;
  const dirty = execFileSync('git', ['status', '--porcelain'], {
    cwd: repoDir,
    encoding: 'utf8',
  }).trim();
  if (!dirty) return Promise.resolve();

  const run = (args) =>
    new Promise((resolve, reject) => {
      const p = spawn('git', args, { cwd: repoDir, stdio: 'inherit' });
      p.on('error', reject);
      p.on('close', (code) =>
        code === 0 ? resolve() : reject(new Error(`git ${args[0]} failed: ${code}`))
      );
    });

  return run(['add', '-A'])
    .then(() => run(['commit', '-m', message]))
    .then(() => (push ? run(['push', remote, branch]) : Promise.resolve()));
}
