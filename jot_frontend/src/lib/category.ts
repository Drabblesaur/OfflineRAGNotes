// Maps free-form note tags onto the design system's 5-hue category palette
// (DESIGN_SYSTEM §1). Tags aren't a fixed enum, so a tag's color is derived
// deterministically from its text — the same tag always renders the same hue.

export type CategoryName = "pink" | "coral" | "butter" | "sage" | "sky";

export type CategoryStyle = {
  dot: string;
  tint: string;
  border: string;
  text: string;
};

// Static, fully-written class names — Tailwind's scanner only picks up
// literal strings, not ones built at runtime (e.g. `bg-cat-${name}`).
const CATEGORY_STYLES: Record<CategoryName, CategoryStyle> = {
  pink: {
    dot: "bg-cat-pink",
    tint: "bg-cat-pink/20",
    border: "border-cat-pink/40",
    text: "text-cat-pink",
  },
  coral: {
    dot: "bg-cat-coral",
    tint: "bg-cat-coral/20",
    border: "border-cat-coral/40",
    text: "text-cat-coral",
  },
  butter: {
    dot: "bg-cat-butter",
    tint: "bg-cat-butter/20",
    border: "border-cat-butter/40",
    text: "text-cat-butter",
  },
  sage: {
    dot: "bg-cat-sage",
    tint: "bg-cat-sage/20",
    border: "border-cat-sage/40",
    text: "text-cat-sage",
  },
  sky: {
    dot: "bg-cat-sky",
    tint: "bg-cat-sky/20",
    border: "border-cat-sky/40",
    text: "text-cat-sky",
  },
};

const CATEGORY_NAMES = Object.keys(CATEGORY_STYLES) as CategoryName[];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function categoryForTag(tag: string): CategoryName {
  const index = hashString(tag.trim().toLowerCase()) % CATEGORY_NAMES.length;
  return CATEGORY_NAMES[index];
}

export function categoryStyleForTag(tag: string): CategoryStyle {
  return CATEGORY_STYLES[categoryForTag(tag)];
}
