/**
 * XSS Sanitization Utilities
 * Uses DOMPurify for enterprise-grade HTML sanitization
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * DOMPurify configuration for product content
 */
const PRODUCT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'blockquote', 'pre', 'code',
    'a', 'span', 'div',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'img', 'figure', 'figcaption',
    'hr', 'sup', 'sub',
  ],
  ALLOWED_ATTR: [
    'href', 'title', 'target', 'rel',
    'src', 'alt', 'width', 'height', 'loading',
    'class', 'id',
  ],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'], // Allow target attribute
  ADD_TAGS: [], // No additional tags
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button', 'select', 'textarea', 'object', 'embed', 'applet'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

/**
 * Strict configuration (no HTML at all)
 */
const STRICT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
};

/**
 * Configuration for reviews (more restrictive)
 */
const REVIEW_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: [],
  ALLOW_DATA_ATTR: false,
};

// Configure DOMPurify hooks for additional security
if (typeof DOMPurify.addHook === 'function') {
  // Force all links to have rel="noopener noreferrer"
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('rel', 'noopener noreferrer');
      // Open external links in new tab
      const href = node.getAttribute('href');
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        node.setAttribute('target', '_blank');
      }
    }
    // Add loading="lazy" to images
    if (node.tagName === 'IMG') {
      node.setAttribute('loading', 'lazy');
    }
  });
}

/**
 * Sanitize HTML string to prevent XSS attacks
 * Uses DOMPurify for robust sanitization
 * 
 * @param html - Raw HTML string from external source
 * @param options - Sanitization options
 * @returns Sanitized HTML string safe for dangerouslySetInnerHTML
 */
export function sanitizeHTML(
  html: string | null | undefined,
  options: {
    allowLinks?: boolean;
    allowImages?: boolean;
    strict?: boolean;
  } = {}
): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const { allowLinks = true, allowImages = true, strict = false } = options;

  // Use strict config if requested
  if (strict) {
    return DOMPurify.sanitize(html, STRICT_CONFIG);
  }

  // Build custom config based on options
  const config = { ...PRODUCT_CONFIG };
  
  if (!allowLinks) {
    config.ALLOWED_TAGS = config.ALLOWED_TAGS?.filter(tag => tag !== 'a');
    config.ALLOWED_ATTR = config.ALLOWED_ATTR?.filter(attr => !['href', 'target', 'rel'].includes(attr));
  }
  
  if (!allowImages) {
    config.ALLOWED_TAGS = config.ALLOWED_TAGS?.filter(tag => tag !== 'img');
    config.ALLOWED_ATTR = config.ALLOWED_ATTR?.filter(attr => !['src', 'alt', 'loading'].includes(attr));
  }

  return DOMPurify.sanitize(html, config);
}

/**
 * Sanitize review content (more restrictive)
 */
export function sanitizeReview(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(html, REVIEW_CONFIG);
}

/**
 * Strip all HTML tags, returning only text content
 * Use this for user-provided content like names that shouldn't have HTML
 */
export function stripHTML(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Use DOMPurify with no allowed tags to get plain text
  const text = DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  
  // Normalize whitespace
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Escape HTML entities for safe text display
 * Use this when you want to show HTML as text (not render it)
 */
export function escapeHTML(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Type guard for safe HTML content
 */
export interface SafeHTML {
  __html: string;
  __sanitized: true;
}

/**
 * Create a safe HTML object for dangerouslySetInnerHTML
 * This provides type safety and guarantees the content is sanitized
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

