/**
 * Build IMS Common Cartridge 1.1 imsmanifest.xml compatible with Moodle's CC 1.1 XSD
 * (backup/cc/schemas11: ManifestMetadata requires lom:lom; Organization uses one ItemOrg
 * wrapper without identifierref; leaf items use Item.Type with title then identifierref).
 *
 * @param {object} opts
 * @param {string} opts.manifestId
 * @param {string} opts.courseTitle — organization title (optional in spec; we emit it)
 * @param {{ id: string, title: string, href: string, resourceId: string }[]} opts.items — href relative to cartridge root
 */
export function buildImsmanifestXml(opts) {
  const { manifestId, courseTitle, items } = opts;
  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');

  const NS_IMSCP = 'http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1';
  const NS_LOM = 'http://ltsc.ieee.org/xsd/imsccv1p1/LOM/manifest';

  const leafItems = items
    .map(
      (it) =>
        `        <item identifier="${esc(it.id)}" identifierref="${esc(it.resourceId)}">
          <title>${esc(it.title)}</title>
        </item>`,
    )
    .join('\n');

  const resources = items
    .map(
      (it) => `    <resource identifier="${esc(it.resourceId)}" type="webcontent" href="${esc(it.href)}">
      <file href="${esc(it.href)}"/>
    </resource>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="${NS_IMSCP}"
    xmlns:lom="${NS_LOM}"
    identifier="${esc(manifestId)}">
  <metadata>
    <schema>IMS Common Cartridge</schema>
    <schemaversion>1.1.0</schemaversion>
    <lom:lom/>
  </metadata>
  <organizations>
    <organization identifier="ORG-ROOT" structure="rooted-hierarchy">
      <title>${esc(courseTitle)}</title>
      <item identifier="ITEM-ROOT">
${leafItems}
      </item>
    </organization>
  </organizations>
  <resources>
${resources}
  </resources>
</manifest>
`;
}
