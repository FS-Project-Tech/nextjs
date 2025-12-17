/**
 * Server-safe XSS Sanitization Utilities
 * NO jsdom
 * NO DOMPurify
 */

import xss from 'xss';

/**
 * Product content sanitizer (allows limited HTML)
 */
export function sanitizeHTML(
  html: string | null | undefined,
  options: {
    allowLinks?: boolean;
    allowImages?: boolean;
    strict?: boolean;
  } = {}
): string {
  if (!html || typeof html !== 'string') return '';

  const { allowLinks = true, allowImages = true, strict = false } = options;

  if (strict) {
    return stripHTML(html);
  }

  return xss(html, {
    whiteList: {
      p: [],
      br: [],
      strong: [],
      b: [],
      em: [],
      i: [],
      ul: [],
      ol: [],
      li: [],
      h1: [],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      blockquote: [],
      code: [],
      pre: [],
      ...(allowLinks
        ? { a: ['href', 'title', 'target', 'rel'] }
        : {}),
      ...(allowImages
        ? { img: ['src', 'alt', 'width', 'height', 'loading'] }
        : {}),
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style'],
  });
}

/**
 * Review sanitizer (very strict)
 */
export function sanitizeReview(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';

  return xss(html, {
    whiteList: {
      p: [],
      br: [],
      strong: [],
      b: [],
      em: [],
      i: [],
      ul: [],
      ol: [],
      li: [],
    },
    stripIgnoreTag: true,
  });
}

/**
 * Strip ALL HTML
 */
export function stripHTML(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';

  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Escape HTML entities
 */
export function escapeHTML(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Safe HTML type
 */
export interface SafeHTML {
  __html: string;
  __sanitized: true;
}

/**
 * Create safe HTML for dangerouslySetInnerHTML
 */
export function createSafeHTML(
  html: string | null | undefined,
  options?: Parameters<typeof sanitizeHTML>[1]
): SafeHTML {
  return {
    __html: sanitizeHTML(html, options),
    __sanitized: true,
  };
}
