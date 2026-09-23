// Regenerates docs.generated.ts from the .md files (owner: B). Run from the repo root: node src/content/legal/generate.mjs
// Root folder = Russian, kk/ = Kazakh (both legally binding), en/ = English (convenience translation).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const read = (sub) =>
  Object.fromEntries(
    readdirSync(join(dir, sub))
      .filter((f) => f.endsWith('.md') && f !== 'README.md')
      .sort()
      .map((f) => [f.replace(/\.md$/, ''), readFileSync(join(dir, sub, f), 'utf8').replace(/\r\n/g, '\n')]),
  );
const langs = { ru: read('.'), kk: read('kk'), en: read('en') };
const obj = (o) => JSON.stringify(o, null, 2);

writeFileSync(
  join(dir, 'docs.generated.ts'),
  `// GENERATED from the .md files in this folder (source of truth). Do not edit by hand:
// after changing a .md file run \`node src/content/legal/generate.mjs\`.

export const LEGAL_RAW = ${obj(langs.ru)} as const;

export type LegalRawSlug = keyof typeof LEGAL_RAW;
export const LEGAL_LANGS = ['ru', 'kk', 'en'] as const;
export type LegalLang = (typeof LEGAL_LANGS)[number];

export const LEGAL_RAW_BY_LANG: Record<LegalLang, Partial<Record<LegalRawSlug, string>>> = {
  ru: LEGAL_RAW,
  kk: ${obj(langs.kk)},
  en: ${obj(langs.en)},
};
`,
);
console.log('docs.generated.ts:', Object.entries(langs).map(([l, d]) => `${l} ${Object.keys(d).length}`).join(', '));
