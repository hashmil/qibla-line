/// <reference types="vite/client" />

declare module "*.css";

interface Window {
  // beforeinstallprompt caught by main.ts before the app bundle loaded
  qiblaEarlyInstallPrompt?: Event;
}
