// Filenames must stay valid across macOS/Windows/Linux — strip characters
// that are reserved on any of them rather than just the current OS.
const INVALID_CHARS = /[/\\:*?"<>|]/g;

export function slugifyFilename(title: string): string {
  const cleaned = title
    // Replace with a space, not delete outright — "Miso/Ramen" should read
    // as "Miso Ramen", not silently mash into "MisoRamen".
    .replace(INVALID_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.+$/, "");
  return cleaned || "Untitled";
}

// Obsidian-style collision handling: "Notes" -> "Notes 2" -> "Notes 3".
// `existingNames` is the set of sibling basenames (no .md extension) in the
// target directory — callers exclude the note being renamed from that set.
export function dedupeFilename(base: string, existingNames: Set<string>): string {
  if (!existingNames.has(base)) return base;
  let i = 2;
  while (existingNames.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}
