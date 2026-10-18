import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "./index.css";
import App from "./App";
import { CASE_ID_PATTERN } from "./lib/format";

// Links shared before the React UI used `/?case=<id>`; keep them working.
const legacyCase = new URLSearchParams(window.location.search).get("case");
if (legacyCase && CASE_ID_PATTERN.test(legacyCase)) {
  window.history.replaceState(null, "", `${window.location.pathname}#/cases/${legacyCase}`);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
