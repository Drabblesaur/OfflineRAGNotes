import { stringifyFrontmatter } from "@/lib/frontmatter";

// ── First-run demo content ───────────────────────────────────────────────────
// Written once, as real .md files with YAML frontmatter, by vault.ts's
// seedVaultIfEmpty() — but only into a freshly-picked, genuinely empty vault.
// Never touches a vault that already has notes/folders in it.

type SeedNote = {
  relPath: string;
  title: string;
  bodyMd: string;
  favorite: boolean;
  tags: string[];
  date: string;
  lastEditedAt: string;
};

const seedNotes: SeedNote[] = [
  {
    relPath: "Q1 Planning.md",
    title: "Q1 Planning",
    bodyMd: `# Q1 Planning

Key goals for this quarter: ship the new onboarding flow, reduce churn by 10%, and close three enterprise deals.

## Action Items

- Finalize roadmap with design team
- Review pricing model
- Schedule kickoff with enterprise prospects

## Notes

The design team flagged that the onboarding flow needs another round of user testing before we can ship. Budget this into the timeline.
`,
    favorite: true,
    tags: ["work", "planning"],
    date: "2026-03-01T00:00:00.000Z",
    lastEditedAt: "2026-03-08T09:15:00.000Z",
  },
  {
    relPath: "My Notes/Book Recommendations.md",
    title: "Book Recommendations",
    bodyMd: `A few books I want to read this year based on recommendations from the team.

- The Pragmatic Programmer
- Thinking in Systems
- Staff Engineer
`,
    favorite: false,
    tags: ["reading"],
    date: "2026-02-15T00:00:00.000Z",
    lastEditedAt: "2026-03-07T14:30:00.000Z",
  },
  {
    relPath: "My Notes/Meeting Notes — Design Review.md",
    title: "Meeting Notes — Design Review",
    bodyMd: `Attendees: Sarah, James, Liu, Priya. Reviewed the new dashboard mockups and discussed feedback from the last user testing session.

Main feedback: the navigation feels cluttered on mobile. Sarah will explore a bottom tab bar approach before next Thursday.
`,
    favorite: false,
    tags: ["work", "meetings", "design"],
    date: "2026-03-06T00:00:00.000Z",
    lastEditedAt: "2026-03-06T10:00:00.000Z",
  },
  {
    relPath: "My Notes/Recipe - Miso Ramen.md",
    title: "Recipe - Miso Ramen",
    bodyMd: `## Ingredients

Miso paste, ramen noodles, soft boiled eggs, nori, green onions, sesame oil, chicken broth.

## Method

Simmer broth for 20 minutes. Whisk in miso. Cook noodles separately. Assemble and top with egg and nori.
`,
    favorite: true,
    tags: ["recipes", "food"],
    date: "2026-01-10T00:00:00.000Z",
    lastEditedAt: "2026-03-04T19:45:00.000Z",
  },
  {
    relPath: "My Notes/Ideas for Side Project.md",
    title: "Ideas for Side Project",
    bodyMd: `Been thinking about building a small tool for tracking reading habits. Could sync with Goodreads or just be standalone.

Alternatively, a CLI tool for generating weekly summaries from git logs would be useful at work.
`,
    favorite: false,
    tags: ["ideas", "dev"],
    date: "2026-03-01T00:00:00.000Z",
    lastEditedAt: "2026-03-01T22:10:00.000Z",
  },
  {
    relPath: "My Notes/Untitled.md",
    title: "Untitled",
    bodyMd: `Just a quick scratch note with no title. Sometimes you just need to jot something down fast.
`,
    favorite: false,
    tags: [],
    date: "2026-02-28T00:00:00.000Z",
    lastEditedAt: "2026-02-28T08:05:00.000Z",
  },
];

export const seedFiles: { relPath: string; content: string }[] = seedNotes.map((note) => ({
  relPath: note.relPath,
  content: stringifyFrontmatter(
    {
      id: crypto.randomUUID(),
      tags: note.tags,
      favorite: note.favorite,
      date: new Date(note.date),
      lastEditedAt: new Date(note.lastEditedAt),
    },
    note.bodyMd,
  ),
}));
