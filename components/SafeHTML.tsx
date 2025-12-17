'use client';

import DOMPurify from 'dompurify';

export default function SafeHTML({ html }: { html: string }) {
  if (!html) return null;

  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });

  return (
    <div
      className="prose max-w-none"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
