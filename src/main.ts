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
  // Chrome fires beforeinstallprompt once, and it can arrive before the app bundle has
  // downloaded. Hold it here for src/lib/install.ts so the install button still works.
  window.addEventListener(
    "beforeinstallprompt",
    (event) => {
      event.preventDefault();
      window.qiblaEarlyInstallPrompt = event;
    },
    { once: true }
  );
  void import("./boot-app");
}
