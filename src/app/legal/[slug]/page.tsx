import { notFound } from 'next/navigation';
import { LegalDocument } from '@/components/domain';
import { LEGAL_DOCS, type LegalSlug } from '@/content/legal';

export function generateStaticParams() {
  return Object.keys(LEGAL_DOCS).map((slug) => ({ slug }));
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = LEGAL_DOCS[slug as LegalSlug];
  if (!doc) notFound();
  return <LegalDocument doc={doc} />;
}
