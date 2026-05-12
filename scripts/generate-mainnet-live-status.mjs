import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const mainnetManifestPath = path.join(root, "deployments", "base-mainnet.public.json");
const postdeployReportPath = path.join(root, "reports", "mainnet-postdeploy", "mainnet-postdeploy-check-v1.json");
const governanceStatusPath = path.join(root, "docs", "governance-gate", "governance-gate-status.json");

const publicJsonPath = path.join(root, "public-docs", "live-status.json");
const publicHtmlPath = path.join(root, "public-docs", "live.html");
const publicDocPath = path.join(root, "docs", "mainnet-live", "MAINNET_LIVE_STATUS.md");

fs.mkdirSync(path.dirname(publicJsonPath), { recursive: true });
fs.mkdirSync(path.dirname(publicDocPath), { recursive: true });

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

const manifest = readJson(mainnetManifestPath);
const postdeploy = readJson(postdeployReportPath);
const governance = readJson(governanceStatusPath);

const postdeployPassed = postdeploy?.status === "PASS";
const contracts = manifest?.contracts || {};
const safes = manifest?.safes || {};

const status = {
  schema: "astra-mainnet-live-status-v0.1",
  generatedAt: new Date().toISOString(),
  project: "AstraTreasury Protocol",
  version: "0.1.1",
  network: {
    name: "Base Mainnet",
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  liveStatus: postdeployPassed
    ? "MAINNET_CONTRACTS_DEPLOYED_RESTRICTED_OPERATION"
    : "MAINNET_DEPLOYED_PENDING_POSTDEPLOY_VERIFICATION",
  deployment: {
    contractsDeployed: Boolean(manifest),
    postdeployVerificationPassed: postdeployPassed,
    governanceSafeSetupComplete: postdeployPassed,
    basescanVerified: manifest?.verification?.basescan === "verified" || manifest?.verification?.etherscan === "verified",
    sourcifyVerified: manifest?.verification?.sourcify === "verified",
    blockscoutStatus: manifest?.verification?.blockscout || null
  },
  restrictions: {
    publicTokenSale: false,
    realTreasuryFunding: false,
    stakingOrRewardsLaunch: false,
    buybackProgram: false,
    autonomousExecution: false
  },
  publicStatement:
    "AstraTreasury Base Mainnet contracts are deployed and Governance Safe setup has been verified. Public token sale, real treasury funding, staking/rewards, buybacks, and autonomous execution remain disabled.",
  contracts,
  safes,
  postdeploySummary: postdeploy?.summary || null,
  governanceGate: governance || null,
  publicPages: {
    mainnet: "/mainnet",
    audit: "/audit",
    governance: "/governance",
    transparency: "/transparency",
    evidence: "/evidence",
    packages: "/packages",
    live: "/live"
  }
};

fs.writeFileSync(publicJsonPath, JSON.stringify(status, null, 2) + "\n");

const contractRows = Object.entries(contracts).map(([name, address]) => {
  return `<tr><td>${escapeHtml(name)}</td><td><code>${escapeHtml(address)}</code></td><td><a target="_blank" rel="noreferrer" href="https://basescan.org/address/${escapeHtml(address)}">BaseScan</a></td></tr>`;
}).join("");

const safeRows = Object.entries(safes).map(([name, address]) => {
  return `<tr><td>${escapeHtml(name)}</td><td><code>${escapeHtml(address)}</code></td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Mainnet Live Status</title>
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
    .ok { color: #3fb950; font-weight: 700; }
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
  <h1>AstraTreasury Mainnet Live Status</h1>
  <div class="muted">Public status. Sanitized and read-only.</div>
</header>

<main>
  <section class="grid">
    <div class="card">
      <h2>Status</h2>
      <div class="big ok">${escapeHtml(status.liveStatus)}</div>
      <div class="muted">Generated ${escapeHtml(status.generatedAt)}</div>
    </div>

    <div class="card">
      <h2>Network</h2>
      <div class="big">Base Mainnet</div>
      <div class="muted">Chain ID: 8453</div>
    </div>

    <div class="card">
      <h2>Verification</h2>
      <div class="big ${postdeployPassed ? "ok" : "warn"}">${postdeployPassed ? "PASS" : "PENDING"}</div>
      <div class="muted">Post-deployment checks</div>
    </div>

    <div class="card">
      <h2>Restrictions</h2>
      <div class="big warn">RESTRICTED</div>
      <div class="muted">No public sale, real treasury funding, staking/rewards, buybacks, or autonomous execution.</div>
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
    <h2>Public Statement</h2>
    <p>${escapeHtml(status.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/live">/api/public/live</a></p>
    <p><a href="/mainnet">Base Mainnet manifest</a></p>
    <p><a href="/transparency">Transparency index</a></p>
    <p><a href="/">Back to public site</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlPath, html + "\n");

const md = [
  "# Mainnet Live Status",
  "",
  `Status: ${status.liveStatus}`,
  "",
  "## Summary",
  "",
  status.publicStatement,
  "",
  "## Restrictions",
  "",
  "- Public token sale: no",
  "- Real treasury funding: no",
  "- Staking/rewards launch: no",
  "- Buyback program: no",
  "- Autonomous execution: no",
  "",
  "## Public pages",
  "",
  "- /live",
  "- /api/public/live",
  "- /mainnet",
  "- /transparency"
];

fs.writeFileSync(publicDocPath, md.join("\n") + "\n");

console.log("Wrote public-docs/live-status.json");
console.log("Wrote public-docs/live.html");
console.log("Wrote docs/mainnet-live/MAINNET_LIVE_STATUS.md");
