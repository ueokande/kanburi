import { useState } from "react";

export function useTaskExpand() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function clearIfMatch(id: string) {
    setExpandedId((prev) => (prev === id ? null : prev));
  }

  return { expandedId, toggleExpand, clearIfMatch };
}
