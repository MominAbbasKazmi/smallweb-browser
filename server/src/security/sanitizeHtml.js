import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li',
  'blockquote', 'code', 'pre', 'a', 'span', 'div', 'section', 'article', 'header', 'footer',
  'main', 'nav', 'hr', 'small', 'sub', 'sup'
];

const ALLOWED_ATTRIBUTES = {
  a: ['href', 'title', 'rel'],
  '*': ['class']
};

export function sanitizeMiniWebHtml(input = '') {
  const rawHtml = typeof input === 'string' ? input : String(input ?? '');
  const sanitized = sanitizeHtml(rawHtml, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto']
    },
    transformTags: {
      a: (tagName, attribs) => {
        const href = typeof attribs.href === 'string' ? attribs.href.trim() : '';
        const normalized = href.toLowerCase();
        const isInternalMiniWebLink = /^[a-z0-9.-]+\.zz$/i.test(normalized) || /^[a-z0-9.-]+\.zz\/?$/i.test(normalized);
        const isAbsoluteUrl = /^https?:\/\//i.test(normalized) || /^mailto:/i.test(normalized);

        if (isInternalMiniWebLink || isAbsoluteUrl) {
          return {
            tagName,
            attribs: {
              ...attribs,
              rel: 'noopener noreferrer',
              target: ''
            }
          };
        }

        return {
          tagName: 'span',
          attribs: {}
        };
      }
    },
    exclusiveFilter: (frame) => {
      if (frame.tag === 'script' || frame.tag === 'style' || frame.tag === 'iframe') {
        return true;
      }
      return false;
    }
  });

  return sanitized.trim();
}
