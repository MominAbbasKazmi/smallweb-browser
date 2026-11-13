import sanitizeHtml from 'sanitize-html';
import { normalizeAddress } from '../utils/normalizeAddress.js';

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li',
  'blockquote', 'code', 'pre', 'a', 'span', 'div', 'section', 'article', 'header', 'footer',
  'main', 'nav', 'hr', 'small', 'sub', 'sup'
];

const ALLOWED_ATTRIBUTES = {
  a: ['href', 'title', 'rel', 'data-miniweb-address', 'data-unsupported-link'],
  '*': ['class']
};

function getMiniWebAddress(href) {
  try {
    return normalizeAddress(href);
  } catch {
    return null;
  }
}

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
        const address = getMiniWebAddress(href);

        if (address) {
          return {
            tagName,
            attribs: {
              href: '#miniweb-link',
              'data-miniweb-address': address,
              rel: 'noopener noreferrer'
            }
          };
        }

        if (normalized.startsWith('#')) {
          return {
            tagName,
            attribs: {
              href,
              title: attribs.title
            }
          };
        }

        return {
          tagName,
          attribs: {
            href: '#unsupported-link',
            'data-unsupported-link': 'true',
            title: attribs.title
          }
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
