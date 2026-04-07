import test from 'node:test';
import assert from 'node:assert/strict';
import { buildImsmanifestXml } from '../src/write-imsmanifest.mjs';

test('buildImsmanifestXml: CC 1.1 structure for Moodle (lom, ItemOrg wrapper, imsccv1p1)', () => {
  const xml = buildImsmanifestXml({
    manifestId: 'M1',
    courseTitle: 'Test course',
    items: [
      {
        id: 'ITEM-A',
        resourceId: 'RES-A',
        title: 'Lesson',
        href: 'web_resources/html/index.html',
      },
    ],
  });
  assert.match(xml, /xmlns="http:\/\/www\.imsglobal\.org\/xsd\/imsccv1p1\/imscp_v1p1"/);
  assert.ok(!xml.includes('imscc_v1p1'), 'must not use legacy imscc_v1p1 xmlns');
  assert.match(xml, /<lom:lom\/>/);
  assert.match(xml, /<item identifier="ITEM-ROOT">/);
  assert.match(xml, /<item identifier="ITEM-A" identifierref="RES-A">\s*\n\s*<title>Lesson<\/title>/);
  assert.match(xml, /structure="rooted-hierarchy"/);
});
