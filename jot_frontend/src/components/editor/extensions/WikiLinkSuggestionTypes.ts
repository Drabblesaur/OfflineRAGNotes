export type WikiLinkSuggestionItem =
  | { kind: "note"; id: string; title: string }
  | { kind: "create"; title: string };
