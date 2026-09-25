import "@fontsource/chivo/400.css";
import "@fontsource/chivo/700.css";
import "@fontsource/chivo-mono/500.css";
import "./styles/landing.css";
import { setupLanding } from "./landing";

// The inline script in index.html picks the mode before first paint (rules in src/lib/mode.ts).
// Computers get the landing page; the map and the app bundle only download for the app.
if (document.documentElement.dataset.mode === "landing") {
  setupLanding();
} else {
  void import("./boot-app");
}
