'use client';

import DOMPurify from 'dompurify';

export default function ProductReviews({ reviews }: { reviews: any[] }) {
  return (
    <ul>
      {reviews.map(r => (
        <li key={r.id}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(r.review),
          }}
        />
      ))}
    </ul>
  );
}
