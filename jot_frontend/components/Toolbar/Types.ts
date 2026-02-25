import { Editor } from "@tiptap/react";

export type HeadingValue = "p" | "h1" | "h2" | "h3";
export type AlignValue = "left" | "center" | "right";

export type EditorState = {
  heading: HeadingValue;
  align: AlignValue;
  bold: boolean;
  italic: boolean;
  strike: boolean;
  highlight: boolean;
  code: boolean;
  bullet: boolean;
  ordered: boolean;
  blockquote: boolean;
  codeBlock: boolean;
};

export const DEFAULT_STATE: EditorState = {
  heading: "p",
  align: "left",
  bold: false,
  italic: false,
  strike: false,
  highlight: false,
  code: false,
  bullet: false,
  ordered: false,
  blockquote: false,
  codeBlock: false,
};

// A regular toggle item — has active state, clicking toggles it
export type ToggleItem = {
  type: "toggle";
  key: string;
  label: string;
  icon: React.ReactNode;
  isActive: (state: EditorState) => boolean;
  run: (editor: Editor) => void;
};

// An action item — no active state, clicking fires a one-shot command
export type ActionItem = {
  type: "action";
  key: string;
  label: string;
  icon: React.ReactNode;
  run: (editor: Editor) => void;
};

// A visual separator between items inside a group (used in dropdowns)
export type SeparatorItem = {
  type: "separator";
  key: string;
};

export type ToolbarItem = ToggleItem | ActionItem | SeparatorItem;

// A group rendered as a dropdown on mobile, an inline section on desktop.
// `groupValue` / `onGroupValueChange` are only present for groups where the
// desktop view uses a ToggleGroup (single-select), e.g. Headings and Alignment.
export type ToolbarGroup =
  | {
      key: string;
      label: string;
      triggerIcon: React.ReactNode;
      groupType: "toggle-group";
      /** Returns the currently active value for the ToggleGroup */
      getGroupValue: (state: EditorState) => string;
      onGroupValueChange: (value: string, editor: Editor) => void;
      items: (ToggleItem | SeparatorItem)[];
    }
  | {
      key: string;
      label: string;
      triggerIcon: React.ReactNode;
      groupType: "free";
      items: ToolbarItem[];
    };