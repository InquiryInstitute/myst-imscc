/**
 * Strip / keep variant blocks in MyST/Markdown sources.
 *
 * Syntax:
 * <!-- myst-imscc-variant: basic,codespace -->
 * ... content ...
 * <!-- /myst-imscc-variant -->
 *
 * The block is included if `activeVariant` is listed, or if the list contains `all`.
 * @param {string} source
 * @param {string} activeVariant
 * @returns {string}
 */
export function applyVariantBlocks(source, activeVariant) {
  const re =
    /<!--\s*myst-imscc-variant:\s*([^-]+?)\s*-->([\s\S]*?)<!--\s*\/myst-imscc-variant\s*-->/g;
  return source.replace(re, (_full, listRaw, body) => {
    const parts = listRaw
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.includes('all') || parts.includes(activeVariant)) return body;
    return '';
  });
}
