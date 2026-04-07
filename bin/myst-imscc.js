#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildVariantPipeline, syncVariantToRepo } from '../src/build-pipeline.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function usage() {
  console.error(`myst-imscc — MyST → IMS CC, Jupyter Book, variant repos

Usage:
  myst-imscc build --config <myst-imscc.config.json> [--variant <key>] [--dry-run]
  myst-imscc build-all --config <myst-imscc.config.json> [--push]

Options:
  --config <path>   JSON config (see README)
  --variant <key>   Single variant (default: first in variants.json)
  --push              After sync: git commit + push
  --dry-run           Build only under .myst-imscc-out/
  --hook <path>       Override beforeImscc hook (resolved from cwd)

Environment:
  AIMA_REPO_ROOT            Monorepo root for hooks (see repoRoot)
  AIMA_VARIANT_REPOS_ROOT   Parent of aima-* clones (see outputRoot)

Config keys:
  repoRoot, outputRoot, beforeImsccHook — see README
`);
  process.exit(1);
}

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

function resolveRepoDir(config, repoRoot, variantKey, entry) {
  const name = entry.repo ?? `${config.repoPrefix ?? 'aima'}-${variantKey}`;
  const org = config.organization ?? 'InquiryInstitute';
  const local = path.join(repoRoot, name);
  return { local, fullName: `${org}/${name}` };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1 || argv.includes('-h') || argv.includes('--help')) usage();

  const cmd = argv[0];
  if (cmd !== 'build' && cmd !== 'build-all') {
    console.error('Unknown command:', cmd);
    usage();
  }

  let configPath = null;
  let variant = null;
  let push = false;
  let dryRun = false;
  let hookOverride = null;

  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--config' && argv[i + 1]) configPath = argv[++i];
    else if (argv[i] === '--variant' && argv[i + 1]) variant = argv[++i];
    else if (argv[i] === '--push') push = true;
    else if (argv[i] === '--dry-run') dryRun = true;
    else if (argv[i] === '--hook' && argv[i + 1]) hookOverride = argv[++i];
  }

  if (!configPath) {
    console.error('Error: --config required');
    usage();
  }

  const configAbs = path.resolve(configPath);
  const config = await readJson(configAbs);
  const configDir = path.dirname(configAbs);
  /** Monorepo root (e.g. aima) — hooks, npm scripts, lectures/ */
  const repoRoot =
    process.env.AIMA_REPO_ROOT ??
    path.resolve(configDir, config.repoRoot ?? config.outputRoot ?? '..');
  /** Where sibling variant repos (aima-*) are cloned */
  const variantReposRoot =
    process.env.AIMA_VARIANT_REPOS_ROOT ??
    path.resolve(configDir, config.outputRoot ?? '..');

  let beforeImscc;
  const hookPath = hookOverride
    ? path.resolve(process.cwd(), hookOverride)
    : config.beforeImsccHook
      ? path.resolve(configDir, config.beforeImsccHook)
      : null;
  if (hookPath) {
    const mod = await import(pathToFileURL(hookPath).href);
    beforeImscc = mod.beforeImscc ?? mod.default;
    if (typeof beforeImscc !== 'function') {
      throw new Error(`beforeImscc hook must export a function: ${hookPath}`);
    }
  }

  const variantsPath = path.join(configDir, config.variantsFile ?? 'variants.json');
  const variantsDoc = await readJson(variantsPath);
  const variantKeys = Object.keys(variantsDoc.variants ?? {});
  if (!variantKeys.length) throw new Error('No variants in variants file');

  const mystSourceDir = path.resolve(configDir, config.mystProject ?? 'myst');
  const courseTitle = config.courseTitle ?? 'Course';

  const jupyterChapters = config.jupyterBook?.chapters ?? null;

  const runVariant = async (key) => {
    const outBase = path.join(configDir, '.myst-imscc-out', key);
    await fs.rm(outBase, { recursive: true, force: true });
    const build = await buildVariantPipeline({
      mystSourceDir,
      workDir: outBase,
      variantKey: key,
      courseTitle,
      exports: jupyterChapters
        ? { jupyterBook: { chapters: jupyterChapters } }
        : {},
      beforeImscc,
      configDir,
      repoRoot,
    });

    console.log('Built:', outBase);
    console.log('  docs:', build.docsDir);
    console.log('  imscc:', build.imsccPath);
    if (build.jupyterBookDir) console.log('  jupyter-book:', build.jupyterBookDir);

    if (dryRun || cmd === 'build') return;

    const entry = variantsDoc.variants[key] ?? {};
    const { local: repoDir } = resolveRepoDir(config, variantReposRoot, key, entry);
    try {
      await fs.access(repoDir);
    } catch {
      console.warn(
        `Skip sync (clone ${repoDir} first): mkdir and gh repo create, or set outputRoot`
      );
      return;
    }

    const readme = `# ${courseTitle} (${key})\n\nBuilt with [myst-imscc](https://github.com/InquiryInstitute/myst-imscc).\n\n- \`docs/\` — GitHub Pages (from IMS CC via imscc-pages)\n- \`course.imscc\` — import into Populi / Canvas / Moodle\n`;
    await syncVariantToRepo({
      build,
      repoDir,
      readme,
      git: { push },
    });
    console.log('Synced:', repoDir);
  };

  if (cmd === 'build') {
    const key = variant ?? variantKeys[0];
    if (!variantsDoc.variants[key]) throw new Error(`Unknown variant: ${key}`);
    await runVariant(key);
    return;
  }

  for (const key of variantKeys) {
    if (variant && key !== variant) continue;
    await runVariant(key);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
