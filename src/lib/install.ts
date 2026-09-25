import { useEffect, useState } from "react";

export type InstallPlatform =
  | "ios-safari"
  | "ios-other"
  | "android-chrome"
  | "android-samsung"
  | "android-firefox"
  | "mac-safari"
  | "desktop-chromium"
  | "desktop-firefox"
  | "unknown";

export type InstallGuide = {
  platform: InstallPlatform;
  device: string;
  browser: string;
  steps: string[];
  note?: string;
};

export const GUIDES: Record<InstallPlatform, InstallGuide> = {
  "ios-safari": {
    platform: "ios-safari",
    device: "iPhone or iPad",
    browser: "Safari",
    steps: [
      "Tap the Share button (the square with an arrow). On iPhone it's at the bottom of the screen, on iPad at the top right.",
      "Scroll down the list and tap Add to Home Screen.",
      "Tap Add. Qibla Line appears on your Home Screen."
    ]
  },
  "ios-other": {
    platform: "ios-other",
    device: "iPhone or iPad",
    browser: "Chrome, Edge or Firefox",
    steps: [
      "Open the browser's Share menu. In Chrome it's the Share button in the address bar; in Edge and Firefox open the menu first, then tap Share.",
      "Tap Add to Home Screen. You may need to tap More to find it.",
      "Tap Add."
    ],
    note: "This needs iOS 16.4 or later. On older versions, open this page in Safari instead."
  },
  "android-chrome": {
    platform: "android-chrome",
    device: "Android",
    browser: "Chrome",
    steps: [
      "Tap the ⋮ menu at the top right.",
      "Tap Add to Home screen, or Install app if you see it.",
      "Tap Install."
    ]
  },
  "android-samsung": {
    platform: "android-samsung",
    device: "Android",
    browser: "Samsung Internet",
    steps: ["Tap the ≡ menu at the bottom right.", "Tap Add page to, then Home screen.", "Tap Add."]
  },
  "android-firefox": {
    platform: "android-firefox",
    device: "Android",
    browser: "Firefox",
    steps: ["Tap the ⋮ menu.", "Tap Install, or Add to Home screen.", "Confirm to add it."]
  },
  "mac-safari": {
    platform: "mac-safari",
    device: "Mac",
    browser: "Safari",
    steps: ["In the menu bar, choose File, then Add to Dock.", "Click Add. Qibla Line opens from the Dock like an app."],
    note: "Needs macOS Sonoma or later."
  },
  "desktop-chromium": {
    platform: "desktop-chromium",
    device: "Computer",
    browser: "Chrome or Edge",
    steps: [
      "Click the install icon at the right end of the address bar.",
      "Click Install. Qibla Line opens in its own window."
    ]
  },
  "desktop-firefox": {
    platform: "desktop-firefox",
    device: "Computer",
    browser: "Firefox",
    steps: ["Firefox on a computer can't install web apps. Open this page in Chrome, Edge or Safari and install it from there."]
  },
  unknown: {
    platform: "unknown",
    device: "This device",
    browser: "your browser",
    steps: [
      "Look in your browser's menu or Share menu for Add to Home Screen or Install.",
      "Confirm to add Qibla Line."
    ]
  }
};

export const GUIDE_GROUPS: { label: string; platforms: InstallPlatform[] }[] = [
  { label: "iPhone and iPad", platforms: ["ios-safari", "ios-other"] },
  { label: "Android", platforms: ["android-chrome", "android-samsung", "android-firefox"] },
  { label: "Computer", platforms: ["desktop-chromium", "mac-safari", "desktop-firefox"] }
];

export function detectPlatform(ua = navigator.userAgent): InstallPlatform {
  // iPadOS reports itself as a Mac, so use touch support to tell them apart
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isIOS) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? "ios-other" : "ios-safari";

  if (/Android/.test(ua)) {
    if (/SamsungBrowser/.test(ua)) return "android-samsung";
    if (/Firefox/.test(ua)) return "android-firefox";
    return "android-chrome";
  }

  if (/Firefox/.test(ua)) return "desktop-firefox";
  if (/Edg\/|Chrome\/|Chromium\//.test(ua)) return "desktop-chromium";
  if (/Macintosh/.test(ua) && /Safari\//.test(ua)) return "mac-safari";
  return "unknown";
}

function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Chrome fires beforeinstallprompt once, possibly before React mounts, so catch it at module load
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    promptListeners.forEach((listener) => listener());
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    promptListeners.forEach((listener) => listener());
  });
}

export function usePwaInstall() {
  const [installed, setInstalled] = useState(isStandalone);
  const [canPrompt, setCanPrompt] = useState(deferredPrompt !== null);

  useEffect(() => {
    const update = () => {
      setCanPrompt(deferredPrompt !== null);
      setInstalled(isStandalone());
    };
    promptListeners.add(update);
    const media = window.matchMedia("(display-mode: standalone)");
    media.addEventListener("change", update);
    return () => {
      promptListeners.delete(update);
      media.removeEventListener("change", update);
    };
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    deferredPrompt = null;
    setCanPrompt(false);
  }

  return { installed, canPrompt, promptInstall };
}
