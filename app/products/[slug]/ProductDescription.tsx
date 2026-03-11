'use client';

import DOMPurify from 'dompurify';
import parse from 'html-react-parser';
import { sanitizeHTML } from '@/lib/utils/sanitize';

export default function ProductDescription({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html);
  return <>{parse(clean)}</>;
}
