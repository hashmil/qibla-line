import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
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

export default defineConfig({
  plugins: [react(), qrCode(), shellAssetList()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
