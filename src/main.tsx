import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BoardProvider } from "./context/BoardContext";
import "./global.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BoardProvider>
      <App />
    </BoardProvider>
  </React.StrictMode>,
);
