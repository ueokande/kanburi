import type { CSSProperties } from "react";
import styles from "./App.module.css";
import { Sidebar } from "./components/Sidebar";
import { WorkspaceContent } from "./components/WorkspaceContent";
import { useSidebarResize } from "./hooks/useSidebarResize";
import { useWorkspace } from "./hooks/useWorkspace";

function App() {
  const workspace = useWorkspace();
  const sidebar = useSidebarResize({
    collapsed: workspace.sidebarCollapsed,
    onCollapsedChange: workspace.setSidebarCollapsed,
  });
  return (
    <div
      className={`${styles.app} ${sidebar.isResizing ? styles.resizing : ""}`}
      style={{ "--sidebar-width": `${sidebar.width}px` } as CSSProperties}
    >
      <Sidebar workspace={workspace} resize={sidebar} />
      <WorkspaceContent workspace={workspace} />
    </div>
  );
}

export default App;
