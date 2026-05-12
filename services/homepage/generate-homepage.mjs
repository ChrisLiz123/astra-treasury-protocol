import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const outHtml = path.join(root, "public-docs", "index.html");
const outJson = path.join(root, "public-docs", "home-status.json");

fs.mkdirSync(path.dirname(outHtml), { recursive: true });

function readJson(relativePath, fallback = {}) {
  try {
    const full = path.join(root, relativePath);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function run(command, fallback = "") {
  try {
    return execSync(command, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return fallback;
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

const mainnet = readJson("public-docs/mainnet-status.json");
const live = readJson("public-docs/live-status.json");
const launch = readJson("public-docs/restricted-launch-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const roadmap = readJson("public-docs/capability-roadmap-status.json");
const stabilization = readJson("public-docs/stabilization-status.json");
const postAnnouncement = readJson("public-docs/post-announcement-status.json");
const packages = readJson("public-docs/package-inventory.json");

const shortCommit = run("git rev-parse --short HEAD", "unknown");
const branch = run("git rev-parse --abbrev-ref HEAD", "unknown");

const contracts = mainnet.contracts || {};
const contractCount = Object.keys(contracts).length;

const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);
const monitorStatus = monitor?.status || "UNKNOWN";
const launchStatus = launch?.status || "UNKNOWN";
const liveStatus = live?.liveStatus || live?.status || "UNKNOWN";
const roadmapStatus = roadmap?.status || "UNKNOWN";
const stabilizationStatus = stabilization?.status || "PENDING_24H_WINDOW";

const status = {
  schema: "astra-home-status-v0.1",
  generatedAt: new Date().toISOString(),
  project: "AstraTreasury Protocol",
  version: "0.1.1",
  branch,
  shortCommit,
  publicStatement:
    "AstraTreasury is deployed on Base Mainnet in restricted operational mode. Public token sale, real treasury funding, staking/rewards, buybacks, autonomous execution, and mainnet execution queue activation remain disabled.",
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  summary: {
    contractCount,
    liveStatus,
    launchStatus,
    monitorStatus,
    alertsResponseRequired: responseRequired,
    activeIncidents,
    roadmapStatus,
    stabilizationStatus,
    packageCount: packages?.summary?.total || null
  },
  restrictions: {
    publicTokenSale: false,
    realTreasuryFunding: false,
    stakingOrRewards: false,
    buybackProgram: false,
    autonomousExecution: false,
    mainnetExecutionQueue: false
  },
  primaryLinks: {
    mainnet: "/mainnet",
    live: "/live",
    monitor: "/monitor",
    launch: "/launch",
    announcement: "/announcement",
    transparency: "/transparency",
    roadmap: "/roadmap"
  }
};

fs.writeFileSync(outJson, JSON.stringify(status, null, 2) + "\n");

const contractCards = Object.entries(contracts).map(([name, address]) => {
  return `
    <a class="contract-card" href="https://basescan.org/address/${escapeHtml(address)}" target="_blank" rel="noreferrer">
      <span>${escapeHtml(name)}</span>
      <code>${escapeHtml(address)}</code>
    </a>
  `;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Protocol</title>
  <meta name="description" content="AstraTreasury Protocol is a restricted Base Mainnet deployment for AI-assisted treasury governance workflows." />
  <style>
    :root {
      color-scheme: dark;
      --bg: #070b12;
      --panel: rgba(18, 27, 43, 0.78);
      --panel-solid: #111827;
      --border: rgba(148, 163, 184, 0.22);
      --text: #e5edf7;
      --muted: #9fb0c6;
      --blue: #60a5fa;
      --cyan: #22d3ee;
      --green: #34d399;
      --yellow: #fbbf24;
      --red: #fb7185;
      --shadow: 0 24px 80px rgba(0,0,0,.38);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background:
        radial-gradient(circle at 20% 10%, rgba(96,165,250,.22), transparent 32%),
        radial-gradient(circle at 80% 0%, rgba(34,211,238,.18), transparent 30%),
        radial-gradient(circle at 50% 80%, rgba(52,211,153,.10), transparent 40%),
        var(--bg);
      color: var(--text);
      min-height: 100vh;
    }

    a { color: inherit; text-decoration: none; }

    .page {
      width: min(1180px, calc(100% - 40px));
      margin: 0 auto;
    }

    header.nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 0;
      gap: 18px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 800;
      letter-spacing: .2px;
    }

    .logo {
      width: 42px;
      height: 42px;
      border-radius: 14px;
      background: linear-gradient(135deg, var(--blue), var(--cyan), var(--green));
      box-shadow: 0 0 40px rgba(34,211,238,.28);
    }

    .nav-links {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .nav-links a {
      color: var(--muted);
      border: 1px solid transparent;
      padding: 9px 12px;
      border-radius: 999px;
      font-size: 14px;
    }

    .nav-links a:hover {
      color: var(--text);
      border-color: var(--border);
      background: rgba(255,255,255,.04);
    }

    .hero {
      padding: 52px 0 30px;
      display: grid;
      grid-template-columns: 1.15fr .85fr;
      gap: 24px;
      align-items: stretch;
    }

    .hero-card, .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 28px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(18px);
    }

    .hero-card {
      padding: 38px;
      position: relative;
      overflow: hidden;
    }

    .hero-card:after {
      content: "";
      position: absolute;
      inset: auto -100px -140px auto;
      width: 360px;
      height: 360px;
      background: radial-gradient(circle, rgba(34,211,238,.22), transparent 68%);
      pointer-events: none;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--green);
      background: rgba(52,211,153,.10);
      border: 1px solid rgba(52,211,153,.22);
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 18px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--green);
      box-shadow: 0 0 20px rgba(52,211,153,.8);
    }

    h1 {
      font-size: clamp(42px, 7vw, 78px);
      line-height: .94;
      letter-spacing: -3px;
      margin: 0 0 18px;
    }

    .gradient {
      background: linear-gradient(135deg, #fff, #9bd5ff 45%, #6ee7b7);
      -webkit-background-clip: text;
      color: transparent;
    }

    .subtitle {
      color: var(--muted);
      font-size: 19px;
      line-height: 1.65;
      max-width: 740px;
      margin: 0 0 28px;
    }

    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 14px;
      padding: 13px 16px;
      font-weight: 800;
      border: 1px solid var(--border);
      background: rgba(255,255,255,.05);
    }

    .button.primary {
      color: #031019;
      background: linear-gradient(135deg, var(--cyan), var(--green));
      border: 0;
    }

    .button:hover { transform: translateY(-1px); }

    .status-stack {
      display: grid;
      gap: 14px;
    }

    .status-card {
      padding: 20px;
      border-radius: 22px;
      background: rgba(15, 23, 42, .78);
      border: 1px solid var(--border);
    }

    .status-card .label {
      color: var(--muted);
      font-size: 13px;
      margin-bottom: 8px;
    }

    .status-card .value {
      font-size: 22px;
      font-weight: 900;
    }

    .ok { color: var(--green); }
    .warn { color: var(--yellow); }
    .danger { color: var(--red); }

    .section {
      padding: 28px 0;
    }

    .section-title {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }

    .section-title h2 {
      margin: 0;
      font-size: 30px;
      letter-spacing: -1px;
    }

    .section-title p {
      margin: 0;
      color: var(--muted);
      max-width: 640px;
      line-height: 1.55;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .panel {
      padding: 22px;
    }

    .panel h3 {
      margin: 0 0 10px;
      font-size: 18px;
    }

    .panel p {
      margin: 0;
      color: var(--muted);
      line-height: 1.55;
    }

    .pill {
      display: inline-flex;
      margin-bottom: 14px;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 800;
      color: var(--green);
      background: rgba(52,211,153,.10);
      border: 1px solid rgba(52,211,153,.2);
    }

    .contract-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .contract-card {
      display: grid;
      gap: 7px;
      padding: 16px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,.035);
    }

    .contract-card span {
      font-weight: 800;
    }

    code {
      color: var(--muted);
      overflow-wrap: anywhere;
      font-size: 12px;
    }

    .links {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .link-card {
      padding: 16px;
      border-radius: 16px;
      background: rgba(255,255,255,.04);
      border: 1px solid var(--border);
      color: var(--text);
      font-weight: 800;
    }

    .link-card small {
      display: block;
      color: var(--muted);
      margin-top: 6px;
      font-weight: 500;
      line-height: 1.4;
    }

    footer {
      color: var(--muted);
      padding: 34px 0 50px;
      line-height: 1.6;
      font-size: 14px;
    }

    @media (max-width: 900px) {
      .hero, .grid, .contract-grid, .links {
        grid-template-columns: 1fr;
      }

      header.nav {
        align-items: flex-start;
        flex-direction: column;
      }

      h1 {
        letter-spacing: -2px;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="nav">
      <a class="brand" href="/">
        <span class="logo" aria-hidden="true"></span>
        <span>AstraTreasury</span>
      </a>
      <nav class="nav-links" aria-label="Primary">
        <a href="/mainnet">Mainnet</a>
        <a href="/live">Live status</a>
        <a href="/monitor">Monitor</a>
        <a href="/launch">Restricted launch</a>
        <a href="/transparency">Transparency</a>
      </nav>
    </header>

    <main>
      <section class="hero">
        <div class="hero-card">
          <div class="eyebrow"><span class="dot"></span> Base Mainnet · restricted operational mode</div>
          <h1><span class="gradient">AI-assisted treasury governance</span> with human approval gates.</h1>
          <p class="subtitle">
            AstraTreasury is a transparent protocol workflow for AI-generated treasury signals,
            policy validation, Safe-based governance, and read-only public monitoring. The Base
            Mainnet deployment is restricted: no public sale, no real treasury funding, no staking
            or rewards, no buybacks, and no autonomous execution.
          </p>
          <div class="actions">
            <a class="button primary" href="/launch">View restricted launch status</a>
            <a class="button" href="/mainnet">View Base Mainnet contracts</a>
            <a class="button" href="/announcement">Read announcement</a>
          </div>
        </div>

        <div class="status-stack">
          <div class="status-card">
            <div class="label">Mainnet status</div>
            <div class="value ok">${escapeHtml(launchStatus)}</div>
          </div>
          <div class="status-card">
            <div class="label">Live mode</div>
            <div class="value ok">${escapeHtml(liveStatus)}</div>
          </div>
          <div class="status-card">
            <div class="label">Operational monitor</div>
            <div class="value ${monitorStatus === "PASS" ? "ok" : "warn"}">${escapeHtml(monitorStatus)}</div>
          </div>
          <div class="status-card">
            <div class="label">Alerts / incidents</div>
            <div class="value ${responseRequired || activeIncidents > 0 ? "warn" : "ok"}">${responseRequired || activeIncidents > 0 ? "Review required" : "Clear"}</div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-title">
          <h2>What is deployed</h2>
          <p>Base Mainnet contracts are public and monitored. Governance Safe setup and post-deployment checks are part of the public restricted-launch evidence trail.</p>
        </div>
        <div class="contract-grid">
          ${contractCards || '<div class="panel">No mainnet contracts found in public manifest.</div>'}
        </div>
      </section>

      <section class="section">
        <div class="section-title">
          <h2>Safety posture</h2>
          <p>The system is intentionally restricted while future capabilities go through separate governance, legal, security, and operations approval tracks.</p>
        </div>
        <div class="grid">
          <div class="panel">
            <span class="pill">Enabled</span>
            <h3>Public monitoring</h3>
            <p>Read-only monitors track contract state, events, alerts, incidents, and evidence snapshots.</p>
          </div>
          <div class="panel">
            <span class="pill">Controlled</span>
            <h3>Safe-based governance</h3>
            <p>Post-deployment roles are configured through Safe-controlled governance workflows.</p>
          </div>
          <div class="panel">
            <span class="pill">Disabled</span>
            <h3>Restricted capabilities</h3>
            <p>Public sale, treasury funding, staking/rewards, buybacks, autonomous execution, and the mainnet execution queue remain disabled.</p>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-title">
          <h2>Explore the public record</h2>
          <p>Every link below is read-only and sanitized for public inspection.</p>
        </div>
        <div class="links">
          <a class="link-card" href="/transparency">Transparency index<small>Contracts, packages, public APIs, and status pages.</small></a>
          <a class="link-card" href="/stabilization">Stabilization<small>Restricted launch stabilization status.</small></a>
          <a class="link-card" href="/roadmap">Capability roadmap<small>Future capabilities remain disabled until separately approved.</small></a>
          <a class="link-card" href="/alerts">Alerts<small>Mainnet alert escalation status.</small></a>
          <a class="link-card" href="/incidents">Incidents<small>Public incident summary without private notes.</small></a>
          <a class="link-card" href="/evidence">Evidence archive<small>Historical public status snapshots.</small></a>
          <a class="link-card" href="/packages">Packages<small>Release and review package inventory.</small></a>
          <a class="link-card" href="/api/public/home">Home API<small>Sanitized homepage status JSON.</small></a>
        </div>
      </section>
    </main>

    <footer>
      AstraTreasury is not offering a public token sale. ASTP is not marketed as an investment product.
      The restricted Base Mainnet deployment does not approve real treasury funding, staking, rewards,
      buybacks, autonomous execution, or mainnet execution queue activation.
      <br />
      Generated ${escapeHtml(status.generatedAt)} · Commit ${escapeHtml(shortCommit)}
    </footer>
  </div>
</body>
</html>`;

fs.writeFileSync(outHtml, html + "\n");

console.log("Wrote public-docs/index.html");
console.log("Wrote public-docs/home-status.json");
