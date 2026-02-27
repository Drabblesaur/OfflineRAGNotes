import React from "react";
import { Undo2, Redo2 } from "lucide-react";
import { Editor } from "@tiptap/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { EditorState, ToolbarGroup, ToolbarItem } from "./Types";
import {
  ToolTip,
  MenuTriggerButton,
  Divider,
  stopBlur,
  ToolbarToggle,
} from "./Primitives";

type Props = {
  editor: Editor;
  groups: ToolbarGroup[];
  state: EditorState;
  track: (open: boolean) => void;
};

function renderDropdownItem(
  item: ToolbarItem,
  state: EditorState,
  editor: Editor,
) {
  if (item.type === "separator") {
    return <DropdownMenuSeparator key={item.key} />;
  }

  if (item.type === "action") {
    return (
      <DropdownMenuItem
        key={item.key}
        onSelect={(e) => {
          e.preventDefault();
          item.run(editor);
        }}
      >
        {item.icon}
        <span className="ml-2">{item.label}</span>
      </DropdownMenuItem>
    );
  }

  // toggle
  return (
    <DropdownMenuCheckboxItem
      key={item.key}
      checked={item.isActive(state)}
      onSelect={(e) => {
        e.preventDefault(); // keep menu open
        item.run(editor);
      }}
    >
      {item.icon}
      <span className="ml-2">{item.label}</span>
    </DropdownMenuCheckboxItem>
  );
}

export function CollapsedToolbar({ editor, groups, state, track }: Props) {
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);

  return (
    <div className="lg:hidden">
      <div className="border rounded-md bg-white/95 backdrop-blur shadow-sm p-1 inline-flex items-center gap-1">
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

        <Divider />

        {/* One dropdown per group */}
        <div className="flex gap-1">
          {groups.map((group) => (
            <DropdownMenu
              key={group.key}
              open={openMenu === group.key}
              onOpenChange={(open) => {
                setOpenMenu(open ? group.key : null);
                track(open);
              }}
            >
              <ToolTip label={group.label}>
                <DropdownMenuTrigger asChild>
                  <MenuTriggerButton
                    icon={group.triggerIcon}
                    label={group.label}
                  />
                </DropdownMenuTrigger>
              </ToolTip>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                onMouseDown={stopBlur}
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                {group.items.map((item) =>
                  renderDropdownItem(item, state, editor),
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </div>
      </div>
    </div>
  );
}
