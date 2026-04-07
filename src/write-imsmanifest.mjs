/**
 * Build a minimal IMS Common Cartridge 1.1 imsmanifest.xml body.
 * @param {object} opts
 * @param {string} opts.manifestId
 * @param {string} opts.courseTitle
 * @param {{ id: string, title: string, href: string }[]} opts.items — href relative to cartridge root (e.g. web_resources/html/index.html)
 */
export function buildImsmanifestXml(opts) {
  const { manifestId, courseTitle, items } = opts;
  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');

  const orgItems = items
    .map(
      (it, i) => `      <item identifier="${esc(it.id)}" identifierref="${esc(it.resourceId)}">
        <title>${esc(it.title)}</title>
      </item>`
    )
    .join('\n');

  const resources = items
    .map(
      (it) => `    <resource identifier="${esc(it.resourceId)}" type="webcontent" href="${esc(it.href)}">
      <file href="${esc(it.href)}"/>
    </resource>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${esc(manifestId)}" xmlns="http://www.imsglobal.org/xsd/imscc_v1p1/imscp_v1p1">
  <metadata>
    <schema>IMS Common Cartridge</schema>
    <schemaversion>1.1.0</schemaversion>
  </metadata>
  <organizations>
    <organization identifier="ORG-ROOT" structure="rooted-hierarchy">
${orgItems}
    </organization>
  </organizations>
  <resources>
${resources}
  </resources>
</manifest>
`;
}
