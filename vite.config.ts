import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import react from "@vitejs/plugin-react";
import QRCode from "qrcode";

const SITE_URL = "https://qiblaline.com";

// The landing page's QR code, drawn at build time so there is no runtime dependency
function qrCode(): Plugin {
  return {
    name: "qibla-line-qr",
    async transformIndexHtml(html) {
      const svg = await QRCode.toString(SITE_URL, {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: "#07090c", light: "#d8d2c4" }
      });
      const labelled = svg.replace("<svg ", '<svg role="img" aria-label="QR code for qiblaline.com" ');
      return html.replaceAll("<!--qr-->", labelled);
    }
  };
}

// The app is loaded with a dynamic import, so index.html no longer names its chunks.
// List every built script and stylesheet for the service worker to cache on install.
function shellAssetList(): Plugin {
  return {
    name: "qibla-line-shell-assets",
    apply: "build",
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle)
        .filter((file) => file.startsWith("assets/") && /\.(js|css)$/.test(file))
        .map((file) => `/${file}`)
        .sort();
      this.emitFile({ type: "asset", fileName: "shell-assets.json", source: JSON.stringify(files) });
    }
  };
}

// /about is the landing page on every device, so phones and Google's phone crawler can read it.
// It is the built index.html with its own canonical URL and title; the inline script in
// index.html picks landing mode from the path.
function aboutPage(): Plugin {
  const swaps: [string, string][] = [
    ['<link rel="canonical" href="https://qiblaline.com/" />', '<link rel="canonical" href="https://qiblaline.com/about" />'],
    ['<meta property="og:url" content="https://qiblaline.com/" />', '<meta property="og:url" content="https://qiblaline.com/about" />'],
    ["<title>Qibla Line: Qibla direction from the walls of your room</title>", "<title>About Qibla Line: how it finds the Qibla without the compass</title>"]
  ];
  return {
    name: "qibla-line-about",
    apply: "build",
    writeBundle(options) {
      const dir = options.dir ?? "dist";
      let html = readFileSync(join(dir, "index.html"), "utf8");
      for (const [from, to] of swaps) {
        if (!html.includes(from)) throw new Error(`about page: missing ${from}`);
        html = html.replace(from, to);
      }
      writeFileSync(join(dir, "about.html"), html);
    }
  };
}

export default defineConfig({
  plugins: [react(), qrCode(), shellAssetList(), aboutPage()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
