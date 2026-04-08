import type { Metadata } from 'next';
import PrivacyPolicyClient from './PrivacyPolicyClient';

const BASE_URL = 'https://elitedigitalconsulting.github.io/neurotonics';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Read the Neurotonics Privacy Policy to understand how we collect, use, and protect your personal information when you visit our website or purchase our products.',
  alternates: {
    canonical: `${BASE_URL}/privacy-policy`,
  },
  openGraph: {
    title: 'Privacy Policy | Neurotonics',
    description:
      'Understand how Neurotonics collects, uses, and protects your personal information.',
    type: 'website',
    url: `${BASE_URL}/privacy-policy`,
    images: [
      {
        url: `${BASE_URL}/images/product-main.png`,
        width: 1200,
        height: 630,
        alt: 'Neurotonics Privacy Policy',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy | Neurotonics',
    description:
      'Understand how Neurotonics collects, uses, and protects your personal information.',
    images: [`${BASE_URL}/images/product-main.png`],
  },
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClient />;
}
