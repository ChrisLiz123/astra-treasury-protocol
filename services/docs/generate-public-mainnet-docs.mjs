import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicDocsDir = path.join(root, "public-docs");
const manifestPath = path.join(root, "deployments", "base-mainnet.public.json");

fs.mkdirSync(publicDocsDir, { recursive: true });

function readJson(filePath, fallback) {
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

const manifest = readJson(manifestPath, null);

if (!manifest) {
  throw new Error("Missing deployments/base-mainnet.public.json. Run npm run mainnet:verification:assets first.");
}

fs.writeFileSync(
  path.join(publicDocsDir, "mainnet-status.json"),
  JSON.stringify(manifest, null, 2) + "\n"
);

const contractRows = Object.entries(manifest.contracts || {})
  .map(([name, address]) => {
    return `<tr><td>${escapeHtml(name)}</td><td><code>${escapeHtml(address)}</code></td><td><a target="_blank" rel="noreferrer" href="https://basescan.org/address/${escapeHtml(address)}">BaseScan</a></td></tr>`;
  })
  .join("");

const safeRows = Object.entries(manifest.safes || {})
  .map(([name, address]) => {
    return `<tr><td>${escapeHtml(name)}</td><td><code>${escapeHtml(address)}</code></td></tr>`;
  })
  .join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Base Mainnet Deployment</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #0d1117; color: #e6edf3; }
    header { padding: 32px; background: #010409; border-bottom: 1px solid #30363d; }
    main { padding: 24px 32px 56px; display: grid; gap: 18px; }
    h1 { margin: 0 0 8px; font-size: 30px; }
    h2 { margin-top: 0; color: #58a6ff; }
    a { color: #58a6ff; }
    .muted { color: #8b949e; overflow-wrap: anywhere; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 14px; padding: 18px; box-shadow: 0 12px 30px rgba(0,0,0,.2); }
    .big { font-size: 26px; font-weight: 700; }
    .warn { color: #d29922; font-weight: 700; }
    .danger { color: #f85149; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; border-bottom: 1px solid #30363d; padding: 10px 8px; vertical-align: top; }
    th { color: #58a6ff; font-size: 13px; }
    td { font-size: 13px; overflow-wrap: anywhere; }
    code { background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 2px 5px; }
  </style>
</head>
<body>
<header>
  <h1>AstraTreasury Base Mainnet Deployment</h1>
  <div class="muted">Public mainnet manifest. Sanitized and read-only.</div>
</header>

<main>
  <section class="grid">
    <div class="card">
      <h2>Network</h2>
      <div class="big">Base Mainnet</div>
      <div class="muted">Chain ID: 8453</div>
    </div>
    <div class="card">
      <h2>Contracts</h2>
      <div class="big">${Object.keys(manifest.contracts || {}).length}</div>
      <div class="muted">BaseScan links below</div>
    </div>
    <div class="card">
      <h2>Safety Status</h2>
      <div class="big warn">Restricted</div>
      <div class="muted">No public sale, no real treasury funding, no staking/rewards, no buyback program.</div>
    </div>
  </section>

  <section class="card">
    <h2>Contracts</h2>
    <table>
      <thead><tr><th>Contract</th><th>Address</th><th>Explorer</th></tr></thead>
      <tbody>${contractRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Safes</h2>
    <table>
      <thead><tr><th>Safe</th><th>Address</th></tr></thead>
      <tbody>${safeRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <p>This deployment does not approve a public token sale, real treasury funding, staking, rewards, buybacks, or autonomous execution.</p>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/mainnet">/api/public/mainnet</a></p>
    <p><a href="/transparency">Transparency index</a></p>
    <p><a href="/">Back to public site</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(path.join(publicDocsDir, "mainnet.html"), html + "\n");

console.log("Wrote public-docs/mainnet-status.json");
console.log("Wrote public-docs/mainnet.html");
