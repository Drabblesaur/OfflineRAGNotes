import type { Note } from "@/components/NoteScreen";
import type { Folder } from "@/components/FolderScreen";

// ── First-run demo content ───────────────────────────────────────────────────
// Consolidates the old mockFolder.tsx/mockNote.tsx into the normalized
// folderId/parentId shape. Written once to IndexedDB by seedIfEmpty() in
// src/lib/db.ts, then never referenced again.

export const seedFolders: Folder[] = [
  {
    id: "folder-1",
    parentId: null,
    name: "My Notes",
  },
];

export const seedNotes: Note[] = [
  {
    id: "note-1",
    folderId: null,
    title: "Q1 Planning",
    contentJSON: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Q1 Planning" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Key goals for this quarter: ship the new onboarding flow, reduce churn by 10%, and close three enterprise deals.",
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Action Items" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Finalize roadmap with design team" },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Review pricing model" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Schedule kickoff with enterprise prospects",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Notes" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "The design team flagged that the onboarding flow needs another round of user testing before we can ship. Budget this into the timeline.",
            },
          ],
        },
      ],
    },
    contentMd:
      "# Q1 Planning\n\nKey goals for this quarter: ship the new onboarding flow, reduce churn by 10%, and close three enterprise deals.\n\n## Action Items\n\n- Finalize roadmap with design team\n- Review pricing model\n- Schedule kickoff with enterprise prospects\n\n## Notes\n\nThe design team flagged that the onboarding flow needs another round of user testing before we can ship.",
    favorite: true,
    tags: ["work", "planning"],
    date: new Date("2026-03-01T00:00:00"),
    lastEditedAt: new Date("2026-03-08T09:15:00"),
  },
  {
    id: "note-2",
    folderId: "folder-1",
    title: "Book Recommendations",
    contentJSON: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "A few books I want to read this year based on recommendations from the team.",
            },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "The Pragmatic Programmer" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Thinking in Systems" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Staff Engineer" }],
                },
              ],
            },
          ],
        },
      ],
    },
    contentMd:
      "A few books I want to read...\n\n- The Pragmatic Programmer\n- Thinking in Systems\n- Staff Engineer",
    favorite: false,
    tags: ["reading"],
    date: new Date("2026-02-15T00:00:00"),
    lastEditedAt: new Date("2026-03-07T14:30:00"),
  },
  {
    id: "note-3",
    folderId: "folder-1",
    title: "Meeting Notes — Design Review",
    contentJSON: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Attendees: Sarah, James, Liu, Priya. Reviewed the new dashboard mockups and discussed feedback from the last user testing session.",
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Main feedback: the navigation feels cluttered on mobile. Sarah will explore a bottom tab bar approach before next Thursday.",
            },
          ],
        },
      ],
    },
    contentMd: "Attendees: Sarah, James, Liu, Priya...",
    favorite: false,
    tags: ["work", "meetings", "design"],
    date: new Date("2026-03-06T00:00:00"),
    lastEditedAt: new Date("2026-03-06T10:00:00"),
  },
  {
    id: "note-4",
    folderId: "folder-1",
    title: "Recipe: Miso Ramen",
    contentJSON: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Ingredients" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Miso paste, ramen noodles, soft boiled eggs, nori, green onions, sesame oil, chicken broth.",
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Method" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Simmer broth for 20 minutes. Whisk in miso. Cook noodles separately. Assemble and top with egg and nori.",
            },
          ],
        },
      ],
    },
    contentMd:
      "## Ingredients\nMiso paste, ramen noodles...\n\n## Method\nSimmer broth for 20 minutes...",
    favorite: true,
    tags: ["recipes", "food"],
    date: new Date("2026-01-10T00:00:00"),
    lastEditedAt: new Date("2026-03-04T19:45:00"),
  },
  {
    id: "note-5",
    folderId: "folder-1",
    title: "Ideas for Side Project",
    contentJSON: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Been thinking about building a small tool for tracking reading habits. Could sync with Goodreads or just be standalone.",
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Alternatively, a CLI tool for generating weekly summaries from git logs would be useful at work.",
            },
          ],
        },
      ],
    },
    contentMd: "Been thinking about building a small tool...",
    favorite: false,
    tags: ["ideas", "dev"],
    date: new Date("2026-03-01T00:00:00"),
    lastEditedAt: new Date("2026-03-01T22:10:00"),
  },
  {
    id: "note-6",
    folderId: "folder-1",
    title: "",
    contentJSON: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Just a quick scratch note with no title. Sometimes you just need to jot something down fast.",
            },
          ],
        },
      ],
    },
    contentMd: "Just a quick scratch note with no title.",
    favorite: false,
    tags: [],
    date: new Date("2026-02-28T00:00:00"),
    lastEditedAt: new Date("2026-02-28T08:05:00"),
  },
];
