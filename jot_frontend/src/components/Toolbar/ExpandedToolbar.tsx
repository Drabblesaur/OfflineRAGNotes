import React from "react";
import { Undo2, Redo2 } from "lucide-react";
import { Editor } from "@tiptap/react";

import { ToggleGroup } from "@/components/ui/toggle-group";

import type { EditorState, ToolbarGroup, ToolbarItem } from "./Types";
import { Divider, ToolbarToggle, ToolbarGroupItem } from "./Primitives";

type Props = {
  editor: Editor;
  groups: ToolbarGroup[];
  state: EditorState;
};

// Renders a single item as an inline toggle or action button.
// Separators are skipped — they're only meaningful inside dropdown menus.
function renderToggleItem(
  item: ToolbarItem,
  state: EditorState,
  editor: Editor,
) {
  if (item.type === "separator") return null;

  return (
    <ToolbarToggle
      key={item.key}
      label={item.label}
      pressed={item.type === "toggle" ? item.isActive(state) : false}
      onToggle={() => item.run(editor)}
    >
      {item.icon}
    </ToolbarToggle>
  );
}

// Groups that use ToggleGroup get single-select radio behaviour on desktop.
// Groups that are "free" render a plain flex row of independent toggles.
function renderGroup(group: ToolbarGroup, state: EditorState, editor: Editor) {
  if (group.groupType === "toggle-group") {
    return (
      <ToggleGroup
        key={group.key}
        type="single"
        value={group.getGroupValue(state)}
        onValueChange={(value) => {
          if (!value) return;
          group.onGroupValueChange(value, editor);
        }}
        className="flex gap-1"
      >
        {group.items.map((item) => {
          if (item.type === "separator") return null;
          return (
            <ToolbarGroupItem
              key={item.key}
              label={item.label}
              value={item.key}
            >
              {item.icon}
            </ToolbarGroupItem>
          );
        })}
      </ToggleGroup>
    );
  }

  // "free" group — independent toggles / actions
  return (
    <div key={group.key} className="flex gap-1">
      {group.items.map((item) => renderToggleItem(item, state, editor))}
    </div>
  );
}

export function ExpandedToolbar({ editor, groups, state }: Props) {
  return (
    <div className="hidden lg:block">
      <div className="border border-line rounded-control bg-paper-card shadow-xs p-1 inline-flex items-center gap-1 whitespace-nowrap overflow-x-auto">
        {/* History */}
        <div className="flex gap-1">
          <ToolbarToggle
            label="Undo"
            pressed={false}
            disabled={!editor.can().chain().focus().undo().run()}
            onToggle={() => editor.chain().focus().undo().run()}
          >
            <Undo2 className="size-4" />
          </ToolbarToggle>
          <ToolbarToggle
            label="Redo"
            pressed={false}
            disabled={!editor.can().chain().focus().redo().run()}
            onToggle={() => editor.chain().focus().redo().run()}
          >
            <Redo2 className="size-4" />
          </ToolbarToggle>
        </div>

        {/* One section per group, with a divider between them */}
        {groups.map((group) => (
          <React.Fragment key={group.key}>
            <Divider />
            {renderGroup(group, state, editor)}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
