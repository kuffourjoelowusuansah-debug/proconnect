function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function safeJsonForHtmlScript(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function absoluteAssetUrl(origin, maybePath) {
  const cleanOrigin = String(origin || '').replace(/\/$/, '');
  const raw = String(maybePath || '').trim();
  if (!raw) return cleanOrigin ? `${cleanOrigin}/icon-512.png` : '/icon-512.png';
  if (/^https?:\/\//i.test(raw)) return raw;
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  return cleanOrigin ? `${cleanOrigin}${normalized}` : normalized;
}

function buildWorkerMetaTags(worker, origin) {
  const cleanOrigin = String(origin || '').replace(/\/$/, '');
  const slugOrId = worker.slug || worker.id;
  const canonicalPath = `/pro/${encodeURIComponent(slugOrId)}`;
  const canonicalUrl = cleanOrigin ? `${cleanOrigin}${canonicalPath}` : canonicalPath;
  const verifiedPart = worker.verified ? 'Verified ' : '';
  const ratingPart = worker.reviews > 0 ? ` · ★ ${worker.rating} (${worker.reviews})` : '';
  const title = `${worker.name} — ${verifiedPart}${worker.category} in ${worker.area} | Nkabom`;
  const rawBio = String(worker.bio || '').trim();
  const desc = rawBio
    ? `${worker.category} in ${worker.area}${ratingPart}. ${rawBio}`.slice(0, 160)
    : `Book ${worker.name}, ${verifiedPart.toLowerCase()}${worker.category} serving ${worker.area}${ratingPart}. Chat directly on WhatsApp via Nkabom.`;
  const imageUrl = absoluteAssetUrl(cleanOrigin, worker.photo || '/icon-512.png');

  return {
    title,
    description: desc,
    canonicalUrl,
    imageUrl,
    tagsHtml: [
      `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
      `<meta property="og:type" content="profile" />`,
      `<meta property="og:site_name" content="Nkabom" />`,
      `<meta property="og:title" content="${escapeHtml(title)}" />`,
      `<meta property="og:description" content="${escapeHtml(desc)}" />`,
      `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
      `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
      `<meta name="twitter:description" content="${escapeHtml(desc)}" />`,
      `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`,
    ].join('\n'),
  };
}

function renderWorkerMetaHtml(baseHtml, { worker, origin, requestedSlug }) {
  let html = String(baseHtml || '');
  if (!worker) {
    const preloadScript = `<script id="nkabom-preload" type="application/json">${safeJsonForHtmlScript({ worker: null, requestedSlug: String(requestedSlug || '') })}</script>`;
    return html.replace('</head>', `${preloadScript}\n</head>`);
  }

  const meta = buildWorkerMetaTags(worker, origin);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`
  );

  const preloadScript = `<script id="nkabom-preload" type="application/json">${safeJsonForHtmlScript({
    worker,
    requestedSlug: String(requestedSlug || worker.slug || worker.id),
  })}</script>`;

  return html.replace('</head>', `${meta.tagsHtml}\n${preloadScript}\n</head>`);
}

module.exports = {
  escapeHtml,
  safeJsonForHtmlScript,
  buildWorkerMetaTags,
  renderWorkerMetaHtml,
};
