import { load, dump } from "js-yaml";

export type NoteMeta = {
  id: string;
  tags: string[];
  favorite: boolean;
  date: Date;
  lastEditedAt: Date;
};

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

// js-yaml auto-resolves unquoted ISO-looking scalars into Date instances via
// its implicit !!timestamp type, so a previously-written date can come back
// either as a Date or a string depending on how it was authored (hand-edited
// vs. app-written) — accept both rather than assuming one.
function coerceDate(value: unknown): Date | null {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

// Never throws — a vault must tolerate hand-edited or pre-existing plain
// .md files with missing/broken frontmatter without failing the whole scan.
export function splitFrontmatter(raw: string): {
  meta: Record<string, unknown>;
  body: string;
} {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return { meta: {}, body: raw };
  try {
    const parsed = load(match[1]);
    const meta =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    return { meta, body: match[2] };
  } catch {
    return { meta: {}, body: raw };
  }
}

export function parseNoteMeta(raw: string): { meta: NoteMeta; body: string } {
  const { meta, body } = splitFrontmatter(raw);
  return {
    meta: {
      id: typeof meta.id === "string" && meta.id ? meta.id : crypto.randomUUID(),
      tags: Array.isArray(meta.tags)
        ? meta.tags.filter((t): t is string => typeof t === "string")
        : [],
      favorite: typeof meta.favorite === "boolean" ? meta.favorite : false,
      date: coerceDate(meta.date) ?? new Date(),
      lastEditedAt: coerceDate(meta.lastEditedAt) ?? new Date(),
    },
    body,
  };
}

export function stringifyFrontmatter(meta: NoteMeta, body: string): string {
  const yamlMeta = {
    id: meta.id,
    tags: meta.tags,
    favorite: meta.favorite,
    date: meta.date.toISOString(),
    lastEditedAt: meta.lastEditedAt.toISOString(),
  };
  return `---\n${dump(yamlMeta).trimEnd()}\n---\n${body}`;
}
