import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import WikiLinkSuggestionList, {
  type WikiLinkSuggestionListHandle,
} from "./WikiLinkSuggestionList";
import type { WikiLinkSuggestionItem } from "./WikiLinkSuggestionTypes";

export const renderWikiLinkSuggestion: SuggestionOptions<WikiLinkSuggestionItem>["render"] = () => {
  let component: ReactRenderer<WikiLinkSuggestionListHandle, SuggestionProps<WikiLinkSuggestionItem>>;
  let unmount: (() => void) | undefined;

  return {
    onStart: (props) => {
      component = new ReactRenderer(WikiLinkSuggestionList, {
        props,
        editor: props.editor,
      });
      // The positioned wrapper ReactRenderer creates has no z-index of its
      // own, so it was stacking below other positioned UI (e.g. the editor
      // toolbar's z-10) — invisible/unclickable wherever it happened to be
      // covered. z-50 matches this app's Dialog/Popover overlay convention.
      (component.element as HTMLElement).classList.add("z-50");
      unmount = props.mount(component.element as HTMLElement);
    },
    onUpdate: (props) => {
      component.updateProps(props);
    },
    onKeyDown: (props) => {
      if (props.event.key === "Escape") {
        unmount?.();
        return true;
      }
      return component.ref?.onKeyDown(props) ?? false;
    },
    onExit: () => {
      unmount?.();
      component.destroy();
    },
  };
};
