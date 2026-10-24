import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import QRCode from "qrcode";

// The QR code sits on the computer landing page, so whoever scans it already has the context: open the app
const QR_URL = "https://qiblaline.com/app";

// The landing page's QR code, drawn at build time so there is no runtime dependency
function qrCode(): Plugin {
  return {
    name: "qibla-line-qr",
    async transformIndexHtml(html) {
      const svg = await QRCode.toString(QR_URL, {
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

// Fills in the build-time placeholders in two files copied from public/:
// - sw.js gets a hash of the build as its cache name, so every deploy installs a new
//   worker and drops the old cache
// - _headers gets the CSP hashes of index.html's inline scripts (the mode script),
//   so they stay allowed whenever that script changes
function buildStamps(): Plugin {
  let outDir = "dist";
  const fill = (file: string, placeholder: string, value: string) => {
    const path = join(outDir, file);
    const text = readFileSync(path, "utf8");
    if (!text.includes(placeholder)) throw new Error(`${file}: missing ${placeholder}`);
    writeFileSync(path, text.replaceAll(placeholder, value));
  };

  return {
    name: "qibla-line-build-stamps",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      // The film is stored in Git LFS. Without git-lfs a checkout holds a small pointer
      // file instead, which would replace the live film if deployed.
      const film = readFileSync(join(outDir, "video", "qibla-line.mp4"));
      if (film.subarray(0, 40).toString("utf8").startsWith("version https://git-lfs")) {
        throw new Error("public/video/qibla-line.mp4 is a Git LFS pointer: install git-lfs and run git lfs pull");
      }

      const html = readFileSync(join(outDir, "index.html"), "utf8");
      const assets = readFileSync(join(outDir, "shell-assets.json"), "utf8");
      fill("sw.js", "__BUILD_ID__", createHash("sha256").update(html).update(assets).digest("hex").slice(0, 12));

      // Executable inline scripts only: JSON-LD isn't run, so CSP doesn't apply to it
      const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)];
      if (inline.length === 0) throw new Error("index.html: expected the inline mode script");
      const hashes = inline.map(([, body]) => `'sha256-${createHash("sha256").update(body ?? "").digest("base64")}'`);
      fill("_headers", "__INLINE_SCRIPT_HASHES__", [...new Set(hashes)].join(" "));
    }
  };
}

export default defineConfig({
  plugins: [react(), qrCode(), shellAssetList(), aboutPage(), buildStamps()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
