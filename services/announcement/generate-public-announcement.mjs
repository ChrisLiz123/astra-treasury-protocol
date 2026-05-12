import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const announcementFile = path.join(root, "docs", "announcement", "RESTRICTED_LAUNCH_ANNOUNCEMENT.md");
const socialFile = path.join(root, "docs", "announcement", "SOCIAL_POST_TEMPLATE.md");
const faqFile = path.join(root, "docs", "announcement", "PUBLIC_FAQ.md");

const launchStatusFile = path.join(root, "public-docs", "restricted-launch-status.json");
const liveStatusFile = path.join(root, "public-docs", "live-status.json");
const monitorStatusFile = path.join(root, "public-docs", "mainnet-monitor-status.json");

const publicJsonFile = path.join(root, "public-docs", "announcement-status.json");
const publicHtmlFile = path.join(root, "public-docs", "announcement.html");

function readText(filePath, fallback = "") {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return fallback;
  }
}

function readJson(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[ch]));
}

function markdownToHtml(text) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      if (line.startsWith("# ")) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
      if (line.startsWith("## ")) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
      if (line.startsWith("- ")) return `<li>${escapeHtml(line.slice(2))}</li>`;
      if (!line.trim()) return "";
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("\n")
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>\n${match}</ul>\n`);
}

const announcement = readText(announcementFile);
const social = readText(socialFile);
const faq = readText(faqFile);

const launchStatus = readJson(launchStatusFile);
const liveStatus = readJson(liveStatusFile);
const monitorStatus = readJson(monitorStatusFile);

const status = {
  schema: "astra-public-announcement-status-v0.1",
  generatedAt: new Date().toISOString(),
  project: "AstraTreasury Protocol",
  version: "0.1.1",
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  announcementStatus: "READY_FOR_REVIEWED_PUBLIC_POSTING",
  restrictedLaunchStatus: launchStatus.status || "UNKNOWN",
  liveStatus: liveStatus.liveStatus || liveStatus.status || "UNKNOWN",
  monitorStatus: monitorStatus.status || "UNKNOWN",
  restrictions: {
    publicTokenSale: false,
    realTreasuryFunding: false,
    stakingOrRewards: false,
    buybackProgram: false,
    autonomousExecution: false,
    mainnetExecutionQueue: false
  },
  publicStatement:
    "AstraTreasury Base Mainnet contracts are deployed in restricted operational mode. This is not a public token sale, investment product, staking/rewards launch, buyback program, or autonomous execution launch.",
  publicLinks: {
    mainnet: "/mainnet",
    live: "/live",
    monitor: "/monitor",
    restrictedOperations: "/restricted-operations",
    launch: "/launch",
    transparency: "/transparency",
    announcement: "/announcement"
  },
  announcement,
  socialTemplate: social,
  faq
};

fs.writeFileSync(publicJsonFile, JSON.stringify(status, null, 2) + "\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Restricted Launch Announcement</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #0d1117; color: #e6edf3; }
    header { padding: 32px; background: #010409; border-bottom: 1px solid #30363d; }
    main { padding: 24px 32px 56px; display: grid; gap: 18px; }
    h1 { margin: 0 0 8px; font-size: 30px; }
    h2 { color: #58a6ff; }
    a { color: #58a6ff; }
    .muted { color: #8b949e; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 14px; padding: 18px; }
    .big { font-size: 26px; font-weight: 700; color: #3fb950; }
    li { margin: 6px 0; }
    pre { white-space: pre-wrap; background: #0d1117; border: 1px solid #30363d; padding: 14px; border-radius: 10px; }
  </style>
</head>
<body>
<header>
  <h1>AstraTreasury Restricted Launch Announcement</h1>
  <div class="muted">Public announcement package. Sanitized and read-only.</div>
</header>

<main>
  <section class="card">
    <h2>Status</h2>
    <div class="big">${escapeHtml(status.announcementStatus)}</div>
    <p>${escapeHtml(status.publicStatement)}</p>
  </section>

  <section class="card">
    ${markdownToHtml(announcement)}
  </section>

  <section class="card">
    <h2>Social Template</h2>
    <pre>${escapeHtml(social)}</pre>
  </section>

  <section class="card">
    ${markdownToHtml(faq)}
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/announcement">/api/public/announcement</a></p>
    <p><a href="/launch">Restricted launch status</a></p>
    <p><a href="/transparency">Transparency index</a></p>
    <p><a href="/">Back to public site</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("Wrote public-docs/announcement-status.json");
console.log("Wrote public-docs/announcement.html");
