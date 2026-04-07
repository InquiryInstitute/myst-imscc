import fs from 'node:fs/promises';
import path from 'node:path';
import { buildImsmanifestXml } from './write-imsmanifest.mjs';
import { copyTree } from './copy-tree.mjs';
import { zipCartridgeFolder } from './zip-cartridge.mjs';

/** @type {Record<string, string>} */
const DEFAULT_PAGE_TITLES = {
  home: 'Course home',
  syllabus: 'Syllabus',
  examples: 'Worked examples',
  assignments: 'Assignments',
  discussions: 'Discussions',
};

/**
 * One CC webcontent item per `index.html` under the MyST static tree (skip `build/` etc.).
 * @param {string} webHtmlDir — e.g. …/_build/html after copy
 * @param {string} webRootRel — path inside cartridge (forward slashes)
 * @returns {Promise<{ id: string, resourceId: string, title: string, href: string }[]>}
 */
export async function gatherWebcontentItems(webHtmlDir, webRootRel = 'web_resources/html') {
  /** @type {{ id: string, resourceId: string, title: string, href: string }[]} */
  const items = [];

  /**
   * @param {string} dir
   * @param {string[]} relSegments path segments under webHtmlDir
   */
  async function walk(dir, relSegments) {
    const indexPath = path.join(dir, 'index.html');
    try {
      await fs.access(indexPath);
      const relFile = [...relSegments, 'index.html'].join('/');
      const href = path.join(webRootRel, relFile).replace(/\\/g, '/');
      const slug =
        relSegments.length === 0 ? 'home' : relSegments[relSegments.length - 1];
      const idBase = slug.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'home';
      const idUpper = idBase.toUpperCase();
      const title = DEFAULT_PAGE_TITLES[slug] ?? titleCaseSlug(slug);
      items.push({
        id: `ITEM-${idUpper}`,
        resourceId: `RES-${idUpper}`,
        title,
        href,
      });
    } catch {
      // folder without index.html — still recurse
    }

    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name.startsWith('.') || e.name === 'build') continue;
      await walk(path.join(dir, e.name), [...relSegments, e.name]);
    }
  }

  await walk(webHtmlDir, []);
  items.sort((a, b) => a.href.localeCompare(b.href));
  return items;
}

function titleCaseSlug(slug) {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Assemble an IMS CC folder from MyST `_build/html` output and optionally zip it.
 * @param {object} o
 * @param {string} o.mystHtmlDir — Absolute path to `_build/html`
 * @param {string} o.cartridgeRoot — Output folder (will contain imsmanifest.xml + web_resources)
 * @param {string} o.courseTitle
 * @param {string} [o.manifestId]
 * @param {string|null} o.zipPath — If set, write `.imscc` zip here
 */
export async function buildImsccFromMystHtml(o) {
  const {
    mystHtmlDir,
    cartridgeRoot,
    courseTitle,
    manifestId = 'AIMA-MANIFEST-001',
    zipPath = null,
  } = o;

  const webHtml = path.join(cartridgeRoot, 'web_resources', 'html');
  await fs.mkdir(path.dirname(webHtml), { recursive: true });
  await copyTree(mystHtmlDir, webHtml);

  const items = await gatherWebcontentItems(webHtml);
  if (items.length === 0) {
    throw new Error(`No index.html pages found under ${webHtml}`);
  }

  const xml = buildImsmanifestXml({
    manifestId,
    courseTitle,
    items,
  });
  await fs.mkdir(cartridgeRoot, { recursive: true });
  await fs.writeFile(path.join(cartridgeRoot, 'imsmanifest.xml'), xml, 'utf8');

  if (zipPath) await zipCartridgeFolder(cartridgeRoot, zipPath);
  return { cartridgeRoot, zipPath };
}
