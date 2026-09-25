import React from "react";
import ReactDOM from "react-dom/client";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles/global.css";
import App from "./App";

// index.html carries the landing page title; the app window keeps the short name
document.title = "Qibla Line";

// From now on "/" opens the app on this phone instead of the first-visit landing page
try {
  localStorage.setItem("qibla-line-opened", "1");
} catch {
  // Storage blocked: the landing page shows again next time, which is harmless
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// iOS Safari ignores user-scalable=no, so a pinch on the map would zoom the whole page.
// Blocking Safari's own gesture events leaves MapLibre's touch handling untouched.
for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
  document.addEventListener(type, (event) => event.preventDefault(), { passive: false });
}

// This module is loaded with a dynamic import, which can land after the load event
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  const register = () => navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

