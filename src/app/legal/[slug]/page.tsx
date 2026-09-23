import { notFound } from 'next/navigation';
import { LegalDocument } from '@/components/domain';
// Not re-exported from the domain index yet.
import { LegalLanguageSwitch } from '@/components/domain/legal';
import { getLegalDoc, isLegalLang, isLegalSlug } from '@/content/legal';

export default async function LegalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const { lang: rawLang } = await searchParams;
  if (!isLegalSlug(slug)) notFound();
  // English UI → English translation by default; KK and RU are the legally binding versions.
  const lang = isLegalLang(rawLang) ? rawLang : 'en';
  return (
    <div className="space-y-6">
      <LegalLanguageSwitch current={lang} basePath={`/legal/${slug}`} className="mx-auto w-full max-w-6xl" />
      <LegalDocument doc={getLegalDoc(slug, lang)} />
    </div>
  );
}
