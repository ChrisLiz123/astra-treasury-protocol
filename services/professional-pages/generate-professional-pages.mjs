import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const outDir = path.join(root, "public-docs");
const docsDir = path.join(root, "docs", "website");

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });

function readJson(relativePath, fallback = {}) {
  try {
    const full = path.join(root, relativePath);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function writeJson(relativePath, value) {
  fs.writeFileSync(path.join(root, relativePath), JSON.stringify(value, null, 2) + "\n");
}

function writeText(relativePath, value) {
  fs.writeFileSync(path.join(root, relativePath), value);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[ch]));
}

function humanize(value, fallback = "Unknown") {
  if (!value) return fallback;

  const map = {
    PASS: "Passing",
    CLEAR: "Clear",
    RESTRICTED_LAUNCH_READY: "Restricted launch ready",
    RESTRICTED_LAUNCH_STABILIZED: "Restricted launch stabilized",
    RESTRICTED_LAUNCH_STABILIZATION_REVIEW_REQUIRED: "Stabilization review pending",
    MAINNET_CONTRACTS_DEPLOYED_RESTRICTED_OPERATION: "Restricted mainnet operation",
    MAINNET_RESTRICTED_OPERATION: "Restricted operation",
    MAINNET_EXECUTION_QUEUE_DISABLED: "Execution queue disabled",
    TRUST_CENTER_READY: "Trust center ready",
    CAPABILITY_ROADMAP_READY: "Roadmap ready",
    NO_PUBLIC_DEX_MARKET_DATA: "No public DEX market data",
    PUBLIC_DEX_MARKET_DATA_AVAILABLE: "Market data available"
  };

  if (map[value]) return map[value];

  return String(value)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function tone(value) {
  const v = String(value || "").toUpperCase();

  if (v.includes("FAIL") || v.includes("ERROR") || v.includes("CRITICAL") || v.includes("ACTIVE_INCIDENT")) return "danger";
  if (v.includes("WARN") || v.includes("REVIEW") || v.includes("PENDING") || v.includes("NO_PUBLIC_DEX")) return "warn";
  return "ok";
}

const mainnet = readJson("public-docs/mainnet-status.json");
const live = readJson("public-docs/live-status.json");
const launch = readJson("public-docs/restricted-launch-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const events = readJson("public-docs/mainnet-event-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const restrictedOps = readJson("public-docs/restricted-operations-status.json");
const execution = readJson("public-docs/mainnet-execution-status.json");
const token = readJson("public-docs/token-status.json");
const wallet = readJson("public-docs/wallet-status.json");
const brand = readJson("public-docs/brand-status.json");
const market = readJson("public-docs/market-status.json");
const roadmap = readJson("public-docs/capability-roadmap-status.json");
const trust = readJson("public-docs/trust-status.json");
const evidence = readJson("public-docs/evidence-index.json");
const packages = readJson("public-docs/package-inventory.json");
const stabilization = readJson("public-docs/stabilization-status.json");

const contracts = mainnet.contracts || {};

const endpoints = [
  ["/api/public/home", "Homepage status"],
  ["/api/public/trust", "Trust Center status"],
  ["/api/public/mainnet", "Base Mainnet manifest"],
  ["/api/public/live", "Live restricted-mode status"],
  ["/api/public/launch", "Restricted launch status"],
  ["/api/public/stabilization", "Restricted launch stabilization"],
  ["/api/public/monitor", "Mainnet operational monitor"],
  ["/api/public/mainnet-events", "Mainnet event monitor"],
  ["/api/public/alerts", "Alert escalation status"],
  ["/api/public/incidents", "Incident summary"],
  ["/api/public/restricted-operations", "Restricted operations status"],
  ["/api/public/mainnet-execution", "Mainnet execution queue status"],
  ["/api/public/token", "AstraToken metadata"],
  ["/api/public/wallet", "Wallet visibility metadata"],
  ["/api/public/brand", "Brand kit metadata"],
  ["/api/public/market", "Read-only market data"],
  ["/api/public/roadmap", "Capability roadmap"],
  ["/api/public/evidence", "Evidence archive"],
  ["/api/public/packages", "Package inventory"],
  ["/api/public/transparency", "Transparency index"],
  ["/api/public/announcement", "Announcement package"],
  ["/api/public/post-announcement", "Post-announcement monitoring"]
];

function baseLayout({ title, eyebrow, intro, statusLabel, statusValue, statusHref, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · AstraTreasury</title>
  <meta name="description" content="${escapeHtml(intro)}" />
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <meta property="og:title" content="${escapeHtml(title)} · AstraTreasury" />
  <meta property="og:description" content="${escapeHtml(intro)}" />
  <meta property="og:image" content="https://astratreasury.ai/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <style>
    :root {
      color-scheme: dark;
      --bg: #08111f;
      --surface: #0e1a2b;
      --surface-2: #111f33;
      --border: rgba(148, 163, 184, 0.20);
      --text: #edf4fb;
      --muted: #9aaec4;
      --blue: #67a7ff;
      --green: #41d49b;
      --yellow: #f4c35f;
      --red: #f87171;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    body {
      margin: 0;
      color: var(--text);
      background: linear-gradient(180deg, #07101d, var(--bg));
    }

    a { color: var(--blue); text-decoration: none; }

    main {
      width: min(1120px, calc(100% - 40px));
      margin: 0 auto;
      padding: 42px 0 72px;
    }

    .top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      margin-bottom: 18px;
    }

    .eyebrow {
      color: var(--green);
      font-weight: 850;
      font-size: 13px;
      letter-spacing: .08em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    h1 {
      margin: 0 0 12px;
      font-size: 42px;
      line-height: 1.04;
      letter-spacing: -1.3px;
    }

    p {
      color: var(--muted);
      line-height: 1.65;
    }

    .status-pill {
      white-space: nowrap;
      border: 1px solid rgba(65, 212, 155, .24);
      background: rgba(65, 212, 155, .10);
      color: var(--green);
      border-radius: 999px;
      padding: 9px 13px;
      font-size: 13px;
      font-weight: 850;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 22px;
      padding: 24px;
      margin-bottom: 18px;
      box-shadow: 0 22px 70px rgba(0,0,0,.25);
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }

    .panel {
      background: rgba(255,255,255,.03);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 18px;
    }

    .panel h3 {
      margin: 0 0 8px;
      font-size: 17px;
    }

    .panel p {
      margin: 0;
      font-size: 14px;
    }

    .kicker {
      color: var(--blue);
      font-size: 12px;
      font-weight: 850;
      text-transform: uppercase;
      letter-spacing: .08em;
      margin-bottom: 9px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--border);
      border-radius: 18px;
      overflow: hidden;
    }

    th, td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
    }

    th {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .08em;
      background: rgba(255,255,255,.03);
    }

    tr:last-child td { border-bottom: 0; }

    code {
      color: var(--muted);
      font-size: 12px;
      overflow-wrap: anywhere;
    }

    .ok { color: var(--green); }
    .warn { color: var(--yellow); }
    .danger { color: var(--red); }

    .notice {
      background: rgba(244,195,95,.08);
      border: 1px solid rgba(244,195,95,.22);
      color: #f7d99a;
      border-radius: 16px;
      padding: 16px;
      line-height: 1.6;
    }

    .links {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .link-card {
      background: rgba(255,255,255,.03);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px;
    }

    .link-card strong {
      display: block;
      margin-bottom: 6px;
    }

    .link-card span {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
    }

    @media (max-width: 860px) {
      .top {
        flex-direction: column;
      }
      .grid-3, .links {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
<main>
  <section class="top">
    <div>
      <div class="eyebrow">${escapeHtml(eyebrow)}</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(intro)}</p>
    </div>
    <a class="status-pill" href="${escapeHtml(statusHref || "/launch")}">${escapeHtml(statusLabel)}: ${escapeHtml(statusValue)}</a>
  </section>

  ${body}

  <section class="card">
    <h2>Restriction notice</h2>
    <div class="notice">
      Public token sale, real treasury funding, staking/rewards, buybacks, autonomous execution,
      paper-to-on-chain automation, and mainnet execution queue activation remain disabled.
    </div>
  </section>

  <section class="card">
    <p><a href="/">Back to homepage</a> · <a href="/trust">Trust Center</a> · <a href="/transparency">Transparency index</a></p>
  </section>
</main>
</body>
</html>`;
}

function panel(kicker, title, text) {
  return `<div class="panel"><div class="kicker">${escapeHtml(kicker)}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></div>`;
}

function statusTable(rows) {
  return `<table><thead><tr><th>Area</th><th>Status</th><th>Reference</th></tr></thead><tbody>${rows.map(([a,b,c]) => {
    return `<tr><td>${escapeHtml(a)}</td><td><span class="${tone(b)}">${escapeHtml(humanize(b))}</span></td><td>${c ? `<a href="${escapeHtml(c)}">View</a>` : ""}</td></tr>`;
  }).join("")}</tbody></table>`;
}

function simpleLinks(rows) {
  return `<div class="links">${rows.map(([href, title, desc]) => {
    return `<a class="link-card" href="${escapeHtml(href)}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(desc)}</span></a>`;
  }).join("")}</div>`;
}

const protocolStatus = {
  schema: "astra-protocol-page-status-v0.1",
  generatedAt: new Date().toISOString(),
  status: "PROTOCOL_OVERVIEW_PUBLISHED",
  mode: live.liveStatus || live.status || "RESTRICTED_MAINNET_OPERATION",
  sections: ["signals", "policy", "safe governance", "monitoring", "restrictions"]
};

const architectureStatus = {
  schema: "astra-architecture-page-status-v0.1",
  generatedAt: new Date().toISOString(),
  status: "ARCHITECTURE_OVERVIEW_PUBLISHED",
  contracts,
  network: { name: "Base Mainnet", chainId: 8453 }
};

const securityStatus = {
  schema: "astra-security-page-status-v0.1",
  generatedAt: new Date().toISOString(),
  status: failuresForSecurity().length === 0 ? "SECURITY_STATUS_READY" : "SECURITY_STATUS_REVIEW_REQUIRED",
  monitorStatus: monitor.status || "UNKNOWN",
  alertStatus: alerts.status || "UNKNOWN",
  activeIncidents: Number(incidents?.summary?.active || 0),
  restrictedOperations: restrictedOps.mode || "UNKNOWN",
  executionQueue: execution.mode || "UNKNOWN",
  failures: failuresForSecurity()
};

function failuresForSecurity() {
  const out = [];
  if (monitor.status !== "PASS") out.push({ check: "mainnet monitor", status: monitor.status || "UNKNOWN" });
  if (alerts.responseRequired === true) out.push({ check: "alerts require response", status: alerts.status || "UNKNOWN" });
  if (Number(incidents?.summary?.active || 0) > 0) out.push({ check: "active incidents", active: incidents.summary.active });
  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") out.push({ check: "execution queue disabled", status: execution.mode || "UNKNOWN" });
  return out;
}

const apiStatus = {
  schema: "astra-api-directory-v0.1",
  generatedAt: new Date().toISOString(),
  status: "PUBLIC_API_DIRECTORY_PUBLISHED",
  endpoints: endpoints.map(([path, description]) => ({ path, description }))
};

const faqStatus = {
  schema: "astra-faq-status-v0.1",
  generatedAt: new Date().toISOString(),
  status: "FAQ_PUBLISHED",
  restrictions: {
    publicTokenSale: false,
    realTreasuryFunding: false,
    stakingOrRewards: false,
    buybackProgram: false,
    autonomousExecution: false,
    mainnetExecutionQueue: false
  }
};

const contractRows = Object.entries(contracts).map(([name, address]) => {
  return `<tr><td>${escapeHtml(name)}</td><td><code>${escapeHtml(address)}</code></td><td><a href="https://basescan.org/address/${escapeHtml(address)}" target="_blank" rel="noreferrer">BaseScan</a></td></tr>`;
}).join("");

const protocolHtml = baseLayout({
  title: "Protocol overview",
  eyebrow: "How AstraTreasury works",
  intro: "AstraTreasury is a governed workflow for AI-assisted treasury signals, policy validation, Safe-based approval, and read-only public monitoring.",
  statusLabel: "Mode",
  statusValue: humanize(live.liveStatus || live.status || "RESTRICTED_MAINNET_OPERATION"),
  statusHref: "/live",
  body: `
<section class="card">
  <div class="grid-3">
    ${panel("Step 1", "Signal generation", "AI-assisted workflows can produce treasury signals or proposals for review.")}
    ${panel("Step 2", "Policy validation", "Signals are checked against treasury policy, asset approval, and operational controls.")}
    ${panel("Step 3", "Human approval", "Governance and execution workflows remain gated by Safe-based human approval.")}
  </div>
</section>
<section class="card">
  <h2>Current protocol status</h2>
  ${statusTable([
    ["Base Mainnet deployment", mainnet.status || "deployed", "/mainnet"],
    ["Restricted launch", launch.status || "UNKNOWN", "/launch"],
    ["Execution queue", execution.mode || "UNKNOWN", "/mainnet-execution"],
    ["Capability roadmap", roadmap.status || "UNKNOWN", "/roadmap"]
  ])}
</section>
<section class="card">
  <h2>Relevant pages</h2>
  ${simpleLinks([
    ["/mainnet", "Mainnet manifest", "Public contract addresses and BaseScan links."],
    ["/roadmap", "Capability roadmap", "Future capability tracks, all disabled until separate approval."],
    ["/trust", "Trust Center", "Consolidated trust, monitoring, and restriction status."]
  ])}
</section>`
});

const architectureHtml = baseLayout({
  title: "Architecture",
  eyebrow: "Contract and control model",
  intro: "AstraTreasury’s public architecture separates policy, vault custody, signal tracking, execution control, token identity, monitoring, and Safe governance.",
  statusLabel: "Network",
  statusValue: "Base Mainnet",
  statusHref: "/mainnet",
  body: `
<section class="card">
  <h2>Contract map</h2>
  <table>
    <thead><tr><th>Contract</th><th>Address</th><th>Explorer</th></tr></thead>
    <tbody>${contractRows || '<tr><td colspan="3">No contracts found in public manifest.</td></tr>'}</tbody>
  </table>
</section>
<section class="card">
  <div class="grid-3">
    ${panel("Policy", "TreasuryPolicy", "Defines approved assets and policy constraints for treasury operations.")}
    ${panel("Custody", "TreasuryVault", "Holds ASTP allocation and enforces executor-role boundaries.")}
    ${panel("Execution", "ExecutionController", "Executes approved actions only through controlled role assignments.")}
    ${panel("Signals", "SignalRegistry", "Tracks signal-related role authority for review workflows.")}
    ${panel("Token", "AstraToken", "ERC-20 identity for ASTP on Base Mainnet.")}
    ${panel("Governance", "Safe controls", "Admin and post-deployment setup are managed through Safe-based processes.")}
  </div>
</section>`
});

const securityHtml = baseLayout({
  title: "Security and monitoring",
  eyebrow: "Public security posture",
  intro: "AstraTreasury publishes read-only monitoring, alerting, incident summaries, evidence snapshots, and restricted-operation controls for public review.",
  statusLabel: "Monitor",
  statusValue: humanize(monitor.status || "UNKNOWN"),
  statusHref: "/monitor",
  body: `
<section class="card">
  <h2>Security status</h2>
  ${statusTable([
    ["Mainnet monitor", monitor.status || "UNKNOWN", "/monitor"],
    ["Event monitor", events.status || "UNKNOWN", "/mainnet-events"],
    ["Alerts", alerts.status || "UNKNOWN", "/alerts"],
    ["Incidents", Number(incidents?.summary?.active || 0) === 0 ? "NO_ACTIVE_INCIDENTS" : "ACTIVE_INCIDENTS_PRESENT", "/incidents"],
    ["Restricted operations", restrictedOps.mode || "UNKNOWN", "/restricted-operations"],
    ["Execution queue", execution.mode || "UNKNOWN", "/mainnet-execution"]
  ])}
</section>
<section class="card">
  <div class="grid-3">
    ${panel("Monitoring", "Read-only checks", "Monitors inspect bytecode, role state, supply, vault balance, restricted flags, and event activity.")}
    ${panel("Alerts", "Escalation workflow", "High and critical alerts create operator review paths and public status updates.")}
    ${panel("Incidents", "Acknowledgement workflow", "Incidents can be acknowledged and resolved privately while publishing sanitized public summaries.")}
  </div>
</section>`
});

const apiRows = endpoints.map(([endpoint, description]) => {
  return `<tr><td><code>${escapeHtml(endpoint)}</code></td><td>${escapeHtml(description)}</td><td><a href="${escapeHtml(endpoint)}">Open</a></td></tr>`;
}).join("");

const apiHtml = baseLayout({
  title: "Public API directory",
  eyebrow: "Read-only public endpoints",
  intro: "AstraTreasury exposes sanitized JSON endpoints for public inspection. These endpoints do not expose private keys, runtime secrets, webhooks, or operator notes.",
  statusLabel: "Endpoints",
  statusValue: String(endpoints.length),
  statusHref: "/api/public/",
  body: `
<section class="card">
  <h2>Public endpoints</h2>
  <table>
    <thead><tr><th>Endpoint</th><th>Description</th><th>Link</th></tr></thead>
    <tbody>${apiRows}</tbody>
  </table>
</section>`
});

const faqItems = [
  ["Is AstraTreasury live on mainnet?", "AstraTreasury contracts are deployed on Base Mainnet in restricted operational mode."],
  ["Is there a public token sale?", "No. No public token sale is approved."],
  ["Is ASTP an investment product?", "No. ASTP is not marketed as an investment product and AstraTreasury does not promise returns."],
  ["Is the treasury funded with real assets?", "No real treasury funding is approved."],
  ["Are staking or rewards live?", "No. Staking and rewards are not approved."],
  ["Are buybacks active?", "No. No buyback program is approved."],
  ["Is autonomous execution live?", "No. Autonomous execution is not approved."],
  ["Is the mainnet execution queue enabled?", "No. The mainnet execution queue remains disabled."],
  ["Why publish market data if there is no public sale?", "The market page is read-only. It shows data only if public DEX data exists and does not approve trading or launch activity."],
  ["Where can I verify the official token metadata?", "Use the token, wallet, brand, and Trust Center pages."]
];

const faqRows = faqItems.map(([q, a]) => {
  return `<tr><td>${escapeHtml(q)}</td><td>${escapeHtml(a)}</td></tr>`;
}).join("");

const faqHtml = baseLayout({
  title: "FAQ",
  eyebrow: "Restricted mode questions",
  intro: "Short answers about AstraTreasury’s restricted Base Mainnet deployment, ASTP visibility, monitoring, and what is not approved.",
  statusLabel: "Mode",
  statusValue: "Restricted",
  statusHref: "/restricted-operations",
  body: `
<section class="card">
  <h2>Frequently asked questions</h2>
  <table>
    <thead><tr><th>Question</th><th>Answer</th></tr></thead>
    <tbody>${faqRows}</tbody>
  </table>
</section>`
});

writeJson("public-docs/protocol-status.json", protocolStatus);
writeJson("public-docs/architecture-status.json", architectureStatus);
writeJson("public-docs/security-status.json", securityStatus);
writeJson("public-docs/api-directory.json", apiStatus);
writeJson("public-docs/faq-status.json", faqStatus);

writeText("public-docs/protocol.html", protocolHtml + "\n");
writeText("public-docs/architecture.html", architectureHtml + "\n");
writeText("public-docs/security.html", securityHtml + "\n");
writeText("public-docs/api.html", apiHtml + "\n");
writeText("public-docs/faq.html", faqHtml + "\n");

writeText("docs/website/PROTOCOL_OVERVIEW.md", "# Protocol overview\n\nAstraTreasury is a governed workflow for AI-assisted treasury signals, policy validation, Safe-based approval, and read-only public monitoring.\n");
writeText("docs/website/ARCHITECTURE_OVERVIEW.md", "# Architecture overview\n\nAstraTreasury separates policy, vault custody, signal tracking, execution control, token identity, and Safe governance.\n");
writeText("docs/website/SECURITY_AND_MONITORING.md", "# Security and monitoring\n\nAstraTreasury publishes monitoring, alert, incident, evidence, and restricted-operation status pages.\n");
writeText("docs/website/PUBLIC_API_DIRECTORY.md", "# Public API directory\n\nRead-only sanitized public endpoints are available under /api/public.\n");
writeText("docs/website/FAQ.md", "# FAQ\n\nAstraTreasury remains in restricted Base Mainnet operation. Public sale, treasury funding, staking/rewards, buybacks, autonomous execution, and mainnet execution queue activation remain disabled.\n");

console.log("Generated professional website pages:");
console.log("- public-docs/protocol.html");
console.log("- public-docs/architecture.html");
console.log("- public-docs/security.html");
console.log("- public-docs/api.html");
console.log("- public-docs/faq.html");
