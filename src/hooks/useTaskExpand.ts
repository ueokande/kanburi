import { useUIDispatch, useUIState } from "../context/BoardContext";

export function useTaskExpand() {
  const { expandedId } = useUIState();
  const dispatch = useUIDispatch();

  function toggleExpand(id: string) {
    dispatch({ type: "TOGGLE_EXPAND", id });
  }

  function clearIfMatch(id: string) {
    dispatch({ type: "CLEAR_EXPAND_IF_MATCH", id });
  }

  return { expandedId, toggleExpand, clearIfMatch };
}
