import type { Note } from "@/components/NoteScreen";

// Matches [[Title]] or [[Title|Alias]] — mirrors the WikiLink tokenizer regex
// in components/editor/extensions/WikiLink.ts. Kept separate (rather than
// imported from there) since this module has no other editor/TipTap
// dependency and is used from plain data code (the notes store, backlinks).
const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// Splits markdown into segments so callers can skip fenced code blocks —
// wikilink rewriting must never touch literal `[[...]]` text a user wrote
// inside a code sample.
function splitByFencedCodeBlocks(bodyMd: string): { text: string; isCode: boolean }[] {
  const parts = bodyMd.split(/(```[\s\S]*?```)/);
  return parts.map((text) => ({ text, isCode: text.startsWith("```") }));
}

export function extractWikiLinkTitles(bodyMd: string): string[] {
  const titles: string[] = [];
  for (const { text, isCode } of splitByFencedCodeBlocks(bodyMd)) {
    if (isCode) continue;
    for (const match of text.matchAll(WIKILINK_RE)) {
      titles.push(match[1].trim());
    }
  }
  return titles;
}

// Notes that link to `targetTitle` (case-insensitive), excluding the target
// note itself in case of a self-link.
export function computeBacklinks(notes: Note[], targetNote: Note): Note[] {
  const target = targetNote.title.trim().toLowerCase();
  if (!target) return [];
  return notes.filter((note) => {
    if (note.id === targetNote.id) return false;
    return extractWikiLinkTitles(note.bodyMd).some(
      (title) => title.toLowerCase() === target,
    );
  });
}

// Rewrites every [[Old Title]] / [[Old Title|Alias]] occurrence (outside
// fenced code blocks) in `bodyMd` to point at `newTitle` — used to keep links
// valid when the note they point to is renamed.
export function rewriteLinksTo(oldTitle: string, newTitle: string, bodyMd: string): string {
  const oldLower = oldTitle.trim().toLowerCase();
  if (!oldLower || oldTitle === newTitle) return bodyMd;
  return splitByFencedCodeBlocks(bodyMd)
    .map(({ text, isCode }) => {
      if (isCode) return text;
      return text.replace(WIKILINK_RE, (full, title: string, alias?: string) => {
        if (title.trim().toLowerCase() !== oldLower) return full;
        return alias !== undefined ? `[[${newTitle}|${alias}]]` : `[[${newTitle}]]`;
      });
    })
    .join("");
}
