import fs from 'node:fs/promises';
import path from 'node:path';
import { readCartridge, renderGitHubPages } from '@inquiryinstitute/imscc-pages';
import { runMystHtmlBuild, defaultMystHtmlOut } from './run-myst.mjs';
import { buildImsccFromMystHtml } from './build-imscc.mjs';
import { prepareMystProjectDir } from './prepare-build-dir.mjs';
import { buildJupyterBookProject } from './jupyter-book.mjs';
import {
  wipeWorkingTreeExceptGit,
  copyArtifactsToVariantRepo,
  gitCommitAndPush,
} from './sync-variant-repos.mjs';
import { copyTree } from './copy-tree.mjs';

/**
 * @typedef {object} VariantConfigEntry
 * @property {string} [repo] — Repo name without org (default: `${prefix}-${key}`)
 * @property {Record<string, boolean>} [flags]
 */

/**
 * Full build for one variant: preprocess → myst → imscc → GitHub Pages from cartridge.
 * @param {object} o
 * @param {string} o.mystSourceDir — Original MyST project in the monorepo
 * @param {string} o.workDir — Temp build root for this variant
 * @param {string} o.variantKey — e.g. `basic`
 * @param {string} o.courseTitle
 * @param {{ jupyterBook?: { chapters: { path: string, title?: string }[] } }} [o.exports]
 */
export async function buildVariantPipeline(o) {
  const {
    mystSourceDir,
    workDir,
    variantKey,
    courseTitle,
    exports = {},
  } = o;

  await fs.mkdir(workDir, { recursive: true });
  const mystBuildDir = path.join(workDir, 'myst-project');
  await prepareMystProjectDir(mystSourceDir, mystBuildDir, variantKey);

  await runMystHtmlBuild(mystBuildDir);
  const htmlDir = defaultMystHtmlOut(mystBuildDir);

  const cartridgeRoot = path.join(workDir, 'cartridge');
  const imsccPath = path.join(workDir, 'course.imscc');
  await buildImsccFromMystHtml({
    mystHtmlDir: htmlDir,
    cartridgeRoot,
    courseTitle,
    zipPath: imsccPath,
  });

  const docsDir = path.join(workDir, 'docs');
  const cartridge = await readCartridge(cartridgeRoot);
  try {
    await renderGitHubPages(cartridge, {
      outDir: docsDir,
      siteTitle: courseTitle,
    });
  } finally {
    if (cartridge.dispose) await cartridge.dispose();
  }

  let jupyterBookDir = null;
  if (exports.jupyterBook?.chapters?.length) {
    jupyterBookDir = path.join(workDir, 'jupyter-book');
    await buildJupyterBookProject({
      title: courseTitle,
      chapters: exports.jupyterBook.chapters,
      mystProjectDir: mystBuildDir,
      outDir: jupyterBookDir,
    });
  }

  return {
    mystBuildDir,
    htmlDir,
    cartridgeRoot,
    imsccPath,
    docsDir,
    jupyterBookDir,
  };
}

/**
 * Sync a variant build into a sibling git repository.
 * @param {object} o
 * @param {Awaited<ReturnType<typeof buildVariantPipeline>>} o.build
 * @param {string} o.repoDir
 * @param {string} o.readme
 * @param {{ push?: boolean }} [o.git]
 */
export async function syncVariantToRepo(o) {
  const { build, repoDir, readme, git } = o;
  await wipeWorkingTreeExceptGit(repoDir);
  await copyArtifactsToVariantRepo({
    repoDir,
    docsDir: build.docsDir,
    imsccFile: build.imsccPath,
    readme,
  });
  if (build.jupyterBookDir) {
    await fs.mkdir(path.join(repoDir, 'jupyter-book'), { recursive: true });
    await copyTree(build.jupyterBookDir, path.join(repoDir, 'jupyter-book'));
  }
  if (git?.push) {
    await gitCommitAndPush(repoDir, 'Update course build (myst-imscc)', { push: true });
  }
}

