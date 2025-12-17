'use client';

import DOMPurify from 'dompurify';
import parse from 'html-react-parser';

export default function ProductDescription({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html);
  return <>{parse(clean)}</>;
}
