import fs from 'node:fs/promises';
import path from 'node:path';
import { buildImsmanifestXml } from './write-imsmanifest.mjs';
import { copyTree } from './copy-tree.mjs';
import { zipCartridgeFolder } from './zip-cartridge.mjs';

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

  const href = 'web_resources/html/index.html';
  const items = [
    {
      id: 'ITEM-COURSE-SITE',
      resourceId: 'RES-COURSE-SITE',
      title: 'Course site',
      href,
    },
  ];

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
