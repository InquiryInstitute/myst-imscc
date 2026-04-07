import { spawn } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveMystCli() {
  try {
    const req = createRequire(import.meta.url);
    const pkgJson = req.resolve('mystmd/package.json');
    const root = path.dirname(pkgJson);
    return path.join(root, 'dist', 'myst.cjs');
  } catch {
    return null;
  }
}

/**
 * Run `myst build --html --ci` in `projectDir` (MyST project root with myst.yml).
 * @param {string} projectDir
 * @param {{ stdio?: 'inherit' | 'pipe' }} [opts]
 * @returns {Promise<void>}
 */
export function runMystHtmlBuild(projectDir, opts = {}) {
  const stdio = opts.stdio ?? 'inherit';
  const cli = resolveMystCli();
  const args = cli
    ? [cli, 'build', '--html', '--ci']
    : ['mystmd', 'build', '--html', '--ci'];
  const cmd = cli ? process.execPath : 'npx';
  const spawnArgs = cli ? args : ['--yes', ...args];

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, spawnArgs, {
      cwd: projectDir,
      env: { ...process.env, CI: '1', BASE_URL: process.env.BASE_URL ?? '' },
      stdio,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`myst build exited with code ${code}`));
    });
  });
}

/**
 * Default path to MyST static HTML export inside a project after `myst build --html`.
 * @param {string} projectDir
 */
export function defaultMystHtmlOut(projectDir) {
  return path.join(projectDir, '_build', 'html');
}
