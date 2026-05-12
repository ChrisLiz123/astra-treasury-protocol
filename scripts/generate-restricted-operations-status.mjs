import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const configPath = path.join(root, "configs", "restricted-operations.config.json");
const manifestPath = path.join(root, "deployments", "base-mainnet.public.json");
const postdeployPath = path.join(root, "reports", "mainnet-postdeploy", "mainnet-postdeploy-check-v1.json");

const publicJsonPath = path.join(root, "public-docs", "restricted-operations-status.json");
const publicHtmlPath = path.join(root, "public-docs", "restricted-operations.html");
const docPath = path.join(root, "docs", "mainnet-live", "RESTRICTED_OPERATIONS_STATUS.md");

fs.mkdirSync(path.dirname(publicJsonPath), { recursive: true });
fs.mkdirSync(path.dirname(docPath), { recursive: true });

function readJson(filePath, fallback = null) {
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

const config = readJson(configPath, {});
const manifest = readJson(manifestPath, {});
const postdeploy = readJson(postdeployPath, {});

const restricted = config.restrictedCapabilities || {};

const status = {
  schema: "astra-public-restricted-operations-status-v0.1",
  generatedAt: new Date().toISOString(),
  project: "AstraTreasury Protocol",
  version: "0.1.1",
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  mode: "MAINNET_RESTRICTED_OPERATION",
  contractsDeployed: Boolean(manifest.contracts),
  postdeployVerificationPassed: postdeploy.status === "PASS",
  restrictedCapabilities: restricted,
  publicStatement:
    "AstraTreasury Base Mainnet contracts are deployed in restricted operational mode. Public token sale, real treasury funding, staking/rewards, buybacks, autonomous execution, and mainnet execution queue activation remain disabled.",
  contracts: manifest.contracts || {},
  safes: manifest.safes || {}
};

fs.writeFileSync(publicJsonPath, JSON.stringify(status, null, 2) + "\n");

const capabilityRows = Object.entries(restricted).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "enabled" : "disabled"}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Restricted Operations</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #0d1117; color: #e6edf3; }
    header { padding: 32px; background: #010409; border-bottom: 1px solid #30363d; }
    main { padding: 24px 32px 56px; display: grid; gap: 18px; }
    h1 { margin: 0 0 8px; font-size: 30px; }
    h2 { margin-top: 0; color: #58a6ff; }
    a { color: #58a6ff; }
    .muted { color: #8b949e; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 14px; padding: 18px; }
    .big { font-size: 26px; font-weight: 700; }
    .warn { color: #d29922; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; border-bottom: 1px solid #30363d; padding: 10px 8px; }
    th { color: #58a6ff; font-size: 13px; }
    td { font-size: 13px; overflow-wrap: anywhere; }
  </style>
</head>
<body>
<header>
  <h1>AstraTreasury Restricted Operations</h1>
  <div class="muted">Public restricted-operations status. Sanitized and read-only.</div>
</header>
<main>
  <section class="card">
    <h2>Mode</h2>
    <div class="big warn">MAINNET_RESTRICTED_OPERATION</div>
    <p>${escapeHtml(status.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Restricted Capabilities</h2>
    <table>
      <thead><tr><th>Capability</th><th>Status</th></tr></thead>
      <tbody>${capabilityRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/restricted-operations">/api/public/restricted-operations</a></p>
    <p><a href="/live">Mainnet live status</a></p>
    <p><a href="/">Back to public site</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlPath, html + "\n");

const md = [
  "# Restricted Operations Status",
  "",
  "Mode: MAINNET_RESTRICTED_OPERATION",
  "",
  status.publicStatement,
  "",
  "## Restricted capabilities",
  "",
  ...Object.entries(restricted).map(([key, value]) => `- ${key}: ${value ? "enabled" : "disabled"}`)
];

fs.writeFileSync(docPath, md.join("\n") + "\n");

console.log("Wrote public-docs/restricted-operations-status.json");
console.log("Wrote public-docs/restricted-operations.html");
console.log("Wrote docs/mainnet-live/RESTRICTED_OPERATIONS_STATUS.md");
