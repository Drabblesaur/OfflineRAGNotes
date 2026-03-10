import type { Note } from "@/components/NoteScreen";

export const mockNote: Note = {
  id: "note-1",
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
};
