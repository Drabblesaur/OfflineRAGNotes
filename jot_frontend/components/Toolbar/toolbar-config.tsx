import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Strikethrough,
  Italic,
  AlignLeft,
  AlignRight,
  AlignCenter,
  List,
  ListOrdered,
  Highlighter,
  Quote,
  Code2,
  Minus,
  Pilcrow,
  Type,
  Wand2,
  TextCursor,
  ListChecks,
} from "lucide-react";

import { ToolbarGroup } from "./Types";

export const TOOLBAR_GROUPS: ToolbarGroup[] = [
  // ── Headings ────────────────────────────────────────────────────────────────
  // Desktop: ToggleGroup (single-select). Mobile: checkbox dropdown.
  {
    key: "headings",
    label: "Headings",
    triggerIcon: <Type className="size-4" />,
    groupType: "toggle-group",
    getGroupValue: (state) => state.heading,
    onGroupValueChange: (value, editor) => {
      if (value === "p") return editor.chain().focus().setParagraph().run();
      const level = value === "h1" ? 1 : value === "h2" ? 2 : 3;
      editor
        .chain()
        .focus()
        .setHeading({ level: level as 1 | 2 | 3 })
        .run();
    },
    items: [
      {
        type: "toggle",
        key: "p",
        label: "Paragraph",
        icon: <Pilcrow className="size-4" />,
        isActive: (s) => s.heading === "p",
        run: (e) => e.chain().focus().setParagraph().run(),
      },
      {
        type: "toggle",
        key: "h1",
        label: "Heading 1",
        icon: <Heading1 className="size-4" />,
        isActive: (s) => s.heading === "h1",
        run: (e) => e.chain().focus().setHeading({ level: 1 }).run(),
      },
      {
        type: "toggle",
        key: "h2",
        label: "Heading 2",
        icon: <Heading2 className="size-4" />,
        isActive: (s) => s.heading === "h2",
        run: (e) => e.chain().focus().setHeading({ level: 2 }).run(),
      },
      {
        type: "toggle",
        key: "h3",
        label: "Heading 3",
        icon: <Heading3 className="size-4" />,
        isActive: (s) => s.heading === "h3",
        run: (e) => e.chain().focus().setHeading({ level: 3 }).run(),
      },
    ],
  },

  // ── Formatting (marks) ───────────────────────────────────────────────────────
  {
    key: "formatting",
    label: "Formatting",
    triggerIcon: <Wand2 className="size-4" />,
    groupType: "free",
    items: [
      {
        type: "toggle",
        key: "bold",
        label: "Bold",
        icon: <Bold className="size-4" />,
        isActive: (s) => s.bold,
        run: (e) => e.chain().focus().toggleBold().run(),
      },
      {
        type: "toggle",
        key: "italic",
        label: "Italic",
        icon: <Italic className="size-4" />,
        isActive: (s) => s.italic,
        run: (e) => e.chain().focus().toggleItalic().run(),
      },
      {
        type: "toggle",
        key: "strike",
        label: "Strikethrough",
        icon: <Strikethrough className="size-4" />,
        isActive: (s) => s.strike,
        run: (e) => e.chain().focus().toggleStrike().run(),
      },
      {
        type: "toggle",
        key: "highlight",
        label: "Highlight",
        icon: <Highlighter className="size-4" />,
        isActive: (s) => s.highlight,
        run: (e) => e.chain().focus().toggleHighlight().run(),
      },
      {
        type: "toggle",
        key: "code",
        label: "Inline code",
        icon: <Code2 className="size-4" />,
        isActive: (s) => s.code,
        run: (e) => e.chain().focus().toggleCode().run(),
      },
    ],
  },

  // ── Alignment ────────────────────────────────────────────────────────────────
  // Desktop: ToggleGroup (single-select). Mobile: checkbox dropdown.
  {
    key: "alignment",
    label: "Alignment",
    triggerIcon: <TextCursor className="size-4" />,
    groupType: "toggle-group",
    getGroupValue: (state) => state.align,
    onGroupValueChange: (value, editor) => {
      editor.chain().focus().setTextAlign(value).run();
    },
    items: [
      {
        type: "toggle",
        key: "left",
        label: "Align left",
        icon: <AlignLeft className="size-4" />,
        isActive: (s) => s.align === "left",
        run: (e) => e.chain().focus().setTextAlign("left").run(),
      },
      {
        type: "toggle",
        key: "center",
        label: "Align center",
        icon: <AlignCenter className="size-4" />,
        isActive: (s) => s.align === "center",
        run: (e) => e.chain().focus().setTextAlign("center").run(),
      },
      {
        type: "toggle",
        key: "right",
        label: "Align right",
        icon: <AlignRight className="size-4" />,
        isActive: (s) => s.align === "right",
        run: (e) => e.chain().focus().setTextAlign("right").run(),
      },
    ],
  },

  // ── Blocks ───────────────────────────────────────────────────────────────────
  {
    key: "blocks",
    label: "Blocks",
    triggerIcon: <ListChecks className="size-4" />,
    groupType: "free",
    items: [
      {
        type: "toggle",
        key: "blockquote",
        label: "Blockquote",
        icon: <Quote className="size-4" />,
        isActive: (s) => s.blockquote,
        run: (e) => e.chain().focus().toggleBlockquote().run(),
      },
      {
        type: "toggle",
        key: "codeBlock",
        label: "Code block",
        icon: <Code2 className="size-4" />,
        isActive: (s) => s.codeBlock,
        run: (e) => e.chain().focus().toggleCodeBlock().run(),
      },
      // Separator before the one-shot divider action
      { type: "separator", key: "sep-1" },
      {
        type: "action",
        key: "divider",
        label: "Divider",
        icon: <Minus className="size-4" />,
        run: (e) => e.chain().focus().setHorizontalRule().run(),
      },
      { type: "separator", key: "sep-2" },
      {
        type: "toggle",
        key: "bullet",
        label: "Bullet list",
        icon: <List className="size-4" />,
        isActive: (s) => s.bullet,
        run: (e) => e.chain().focus().toggleBulletList().run(),
      },
      {
        type: "toggle",
        key: "ordered",
        label: "Ordered list",
        icon: <ListOrdered className="size-4" />,
        isActive: (s) => s.ordered,
        run: (e) => e.chain().focus().toggleOrderedList().run(),
      },
    ],
  },
];
