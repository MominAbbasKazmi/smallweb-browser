import { describe, expect, it } from 'vitest';
import { sanitizeMiniWebHtml } from '../src/security/sanitizeHtml.js';
import { extractPlainText } from '../src/utils/extractPlainText.js';

describe('published page security', () => {
  it('removes active content and rewrites links to safe in-frame targets', () => {
    const sanitized = sanitizeMiniWebHtml(`
      <h1>Safe page</h1>
      <p onclick="alert(1)">Readable text</p>
      <script>window.parent.document.body.innerHTML = 'owned';</script>
      <img src="https://example.com/pixel.png" onerror="alert(1)">
      <iframe src="https://example.com"></iframe>
      <a href="javascript:alert(1)">unsafe link</a>
      <a href="https://example.com/page">external link</a>
      <a href="tidepool.zz">small-web link</a>
      <a href="#notes">section link</a>
    `);

    expect(sanitized).toContain('<h1>Safe page</h1>');
    expect(sanitized).not.toMatch(/<script|<iframe|<img|onerror|onclick|javascript:/i);
    expect(sanitized).not.toContain('window.parent');
    expect(sanitized).toContain('href="#unsupported-link"');
    expect(sanitized).toContain('data-unsupported-link="true"');
    expect(sanitized.match(/data-unsupported-link="true"/g)).toHaveLength(2);
    expect(sanitized).toContain('href="#miniweb-link"');
    expect(sanitized).toContain('data-miniweb-address="tidepool.zz"');
    expect(sanitized).toContain('href="#notes"');
  });

  it('extracts readable text only from the sanitized page', () => {
    const sanitized = sanitizeMiniWebHtml(
      '<h1>Quiet harbor</h1><script>secret()</script><p>Waves at sunset.</p>'
    );

    expect(extractPlainText(sanitized)).toBe('Quiet harbor Waves at sunset.');
  });
});
