import { useEffect, useState } from "react";

export type InstallPlatform =
  | "ios-safari"
  | "ios-other"
  | "in-app"
  | "android-chrome"
  | "android-samsung"
  | "android-firefox"
  | "mac-safari"
  | "desktop-chromium"
  | "desktop-firefox"
  | "unknown";

export type StepIcon = "share" | "add-home" | "add" | "menu-dots" | "menu-lines" | "install" | "open-browser" | "dock";

// Rendered as: lead <strong>target</strong> tail
export type InstallStep = { icon: StepIcon; lead: string; target: string; tail?: string };

export type InstallGuide = {
  platform: InstallPlatform;
  device: string;
  browser: string;
  steps: InstallStep[];
  note?: string;
};

export const GUIDES: Record<InstallPlatform, InstallGuide> = {
  "ios-safari": {
    platform: "ios-safari",
    device: "iPhone",
    browser: "Safari",
    steps: [
      { icon: "share", lead: "Tap ", target: "Share", tail: " in Safari's toolbar. If you can't see it, tap ⋯ first." },
      { icon: "add-home", lead: "Scroll down and tap ", target: "Add to Home Screen" },
      { icon: "add", lead: "Tap ", target: "Add", tail: " at the top right." }
    ]
  },
  "ios-other": {
    platform: "ios-other",
    device: "iPhone",
    browser: "Chrome, Edge or Firefox",
    steps: [
      { icon: "share", lead: "Tap ", target: "Share", tail: ". In Chrome it's in the address bar; in Edge and Firefox, open the menu first." },
      { icon: "add-home", lead: "Tap ", target: "Add to Home Screen", tail: ". You may need to tap More to find it." },
      { icon: "add", lead: "Tap ", target: "Add" }
    ],
    note: "Needs iOS 16.4 or later. On older iPhones, open this page in Safari."
  },
  "in-app": {
    platform: "in-app",
    device: "phone",
    browser: "an app's built-in browser",
    steps: [
      { icon: "open-browser", lead: "Tap ⋯ and choose ", target: "Open in browser", tail: " (or Open in Safari)." },
      { icon: "add-home", lead: "Then add it from there with ", target: "Add to Home Screen" }
    ],
    note: "Apps like Instagram and WhatsApp open links in their own viewer, which can't add apps to your Home Screen."
  },
  "android-chrome": {
    platform: "android-chrome",
    device: "Android phone",
    browser: "Chrome",
    steps: [
      { icon: "menu-dots", lead: "Tap the ", target: "⋮ menu", tail: " at the top right." },
      { icon: "add-home", lead: "Tap ", target: "Install app", tail: ". Older versions say Add to Home screen." },
      { icon: "add", lead: "Tap ", target: "Install" }
    ]
  },
  "android-samsung": {
    platform: "android-samsung",
    device: "Android phone",
    browser: "Samsung Internet",
    steps: [
      { icon: "menu-lines", lead: "Tap the ", target: "≡ menu", tail: " at the bottom right." },
      { icon: "add-home", lead: "Tap ", target: "Add page to", tail: ", then Home screen." },
      { icon: "add", lead: "Tap ", target: "Add" }
    ]
  },
  "android-firefox": {
    platform: "android-firefox",
    device: "Android phone",
    browser: "Firefox",
    steps: [
      { icon: "menu-dots", lead: "Tap the ", target: "⋮ menu" },
      { icon: "add-home", lead: "Tap ", target: "Install", tail: ", or Add to Home screen." },
      { icon: "add", lead: "Confirm with ", target: "Add" }
    ]
  },
  "mac-safari": {
    platform: "mac-safari",
    device: "Mac",
    browser: "Safari",
    steps: [
      { icon: "dock", lead: "In the menu bar, choose ", target: "File › Add to Dock" },
      { icon: "add", lead: "Click ", target: "Add", tail: ". It opens from the Dock like any app." }
    ],
    note: "Needs macOS Sonoma or later."
  },
  "desktop-chromium": {
    platform: "desktop-chromium",
    device: "computer",
    browser: "Chrome or Edge",
    steps: [
      { icon: "install", lead: "Click the ", target: "install icon", tail: " at the right end of the address bar." },
      { icon: "add", lead: "Click ", target: "Install", tail: ". It opens in its own window." }
    ]
  },
  "desktop-firefox": {
    platform: "desktop-firefox",
    device: "computer",
    browser: "Firefox",
    steps: [{ icon: "open-browser", lead: "Firefox can't install web apps. Open this page in ", target: "Chrome, Edge or Safari", tail: " and install it there." }]
  },
  unknown: {
    platform: "unknown",
    device: "device",
    browser: "your browser",
    steps: [
      { icon: "menu-dots", lead: "Open your browser's ", target: "menu", tail: " or Share menu." },
      { icon: "add-home", lead: "Look for ", target: "Add to Home Screen", tail: " or Install." }
    ]
  }
};

export const GUIDE_GROUPS: { label: string; platforms: InstallPlatform[] }[] = [
  { label: "iPhone and iPad", platforms: ["ios-safari", "ios-other"] },
  { label: "Android", platforms: ["android-chrome", "android-samsung", "android-firefox"] },
  { label: "Computer", platforms: ["desktop-chromium", "mac-safari", "desktop-firefox"] },
  { label: "Opened from another app", platforms: ["in-app"] }
];

export function detectPlatform(ua = navigator.userAgent): InstallPlatform {
  // Instagram, Facebook, LinkedIn, Snapchat, Line and the Google app all use their own web views
  if (/FBAN|FBAV|Instagram|LinkedInApp|Snapchat|Line\/|GSA\//.test(ua)) return "in-app";

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

const DISMISS_KEY = "qibla-line-install-dismissed";
const DISMISS_DAYS = 30;

export function rememberInstallDismissed(now = Date.now()) {
  try {
    localStorage.setItem(DISMISS_KEY, String(now));
  } catch {
    // Private mode or storage blocked: it will simply ask again next visit
  }
}

function dismissedRecently(now = Date.now()): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && now - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

// Phones get the sheet on their own; computers only when the browser can install in one click
export function shouldAutoShowInstall(platform: InstallPlatform, canPrompt: boolean): boolean {
  if (dismissedRecently()) return false;
  if (platform === "desktop-firefox" || platform === "unknown") return false;
  if (platform === "desktop-chromium" || platform === "mac-safari") return canPrompt;
  return true;
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
