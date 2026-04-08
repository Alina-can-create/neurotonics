'use client';

import Link from 'next/link';
import siteContent from '@/content/site.json';

export default function AnnouncementBar() {
  const { announcement } = siteContent;

  if (!announcement) return null;

  const fullText = `${announcement.text}${announcement.linkText ? ` ${announcement.linkText}` : ''}`;

  const item = (key: string) => (
    <span key={key} className="flex items-center gap-6 px-8 whitespace-nowrap">
      <span>{announcement.text}</span>
      {announcement.link && (
        <Link href={announcement.link} className="underline font-semibold hover:text-brand-warm transition-colors" tabIndex={-1}>
          {announcement.linkText}
        </Link>
      )}
    </span>
  );

  return (
    <div
      className="bg-brand-navy text-white py-2 text-xs sm:text-sm tracking-wide overflow-hidden"
      aria-label={fullText}
    >
      {/* Accessible hidden text so screen readers only read once */}
      <span className="sr-only">
        {announcement.text}
        {announcement.link && (
          <Link href={announcement.link}>{announcement.linkText}</Link>
        )}
      </span>
      <div className="animate-marquee" aria-hidden="true">
        {item('a')}
        {item('b')}
        {item('c')}
        {item('d')}
      </div>
    </div>
  );
}
