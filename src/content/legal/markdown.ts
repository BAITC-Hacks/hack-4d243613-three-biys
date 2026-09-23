// Tiny markdown parser for the legal texts (owner: B). Supports exactly what the .md files use:
// YAML-like frontmatter, # / ## / ### headings, paragraphs, - and 1. lists, pipe tables,
// **bold** and {{placeholders}}. Output is data; LegalDocument renders it without innerHTML.

export type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string; id: string }
  | { type: 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'table'; head: string[]; rows: string[][] };

export type ParsedDoc = {
  slug: string;
  title: string;
  meta: Record<string, string>;
  blocks: Block[];
};

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const meta: Record<string, string> = {};
  if (!raw.startsWith('---')) return { meta, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { meta, body: raw };
  for (const line of raw.slice(3, end).split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!m) continue;
    meta[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }
  return { meta, body: raw.slice(end + 4) };
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());

export function parseMarkdown(slug: string, raw: string): ParsedDoc {
  const { meta, body } = parseFrontmatter(raw);
  const lines = body.split(/\r?\n/);
  const blocks: Block[] = [];
  let para: string[] = [];
  let h2 = 0;
  const flush = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t) {
      flush();
      continue;
    }
    const h = t.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flush();
      const level = h[1].length as 1 | 2 | 3;
      if (level === 2) h2 += 1;
      blocks.push({ type: `h${level}` as 'h1' | 'h2' | 'h3', text: h[2], id: level === 2 ? `s-${h2}` : `h-${i}` });
      continue;
    }
    if (t.startsWith('|')) {
      flush();
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(cells(lines[i]));
        i++;
      }
      i--;
      const [head = [], ...rest] = rows.filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c)));
      blocks.push({ type: 'table', head, rows: rest });
      continue;
    }
    const ul = t.match(/^[-*]\s+(.*)$/);
    const ol = t.match(/^\d+\.\s+(.*)$/);
    if (ul || ol) {
      flush();
      const type = ul ? 'ul' : 'ol';
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(type === 'ul' ? /^[-*]\s+(.*)$/ : /^\d+\.\s+(.*)$/);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      i--;
      blocks.push({ type, items });
      continue;
    }
    para.push(t);
  }
  flush();

  const h1 = blocks.find((b) => b.type === 'h1');
  return { slug, meta, title: meta.title || (h1 && 'text' in h1 ? h1.text : slug), blocks };
}
