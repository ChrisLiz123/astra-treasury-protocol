import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const files = {
  config: "configs/full-launch-readiness.config.json",
  stabilization: "public-docs/stabilization-status.json",
  launch: "public-docs/restricted-launch-status.json",
  trust: "public-docs/trust-status.json",
  restrictedOps: "public-docs/restricted-operations-status.json",
  execution: "public-docs/mainnet-execution-status.json",
  roadmap: "public-docs/capability-roadmap-status.json",
  monitor: "public-docs/mainnet-monitor-status.json",
  alerts: "public-docs/mainnet-alerts-status.json",
  incidents: "public-docs/incident-summary.json",
  market: "public-docs/market-status.json",
  token: "public-docs/token-status.json"
};

const reportDir = path.join(root, "reports", "full-launch");
const reportFile = path.join(reportDir, "full-launch-readiness-status.json");

const publicJsonFile = path.join(root, "public-docs", "full-launch-status.json");
const publicHtmlFile = path.join(root, "public-docs", "full-launch.html");

fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(path.dirname(publicJsonFile), { recursive: true });

function readJson(relativePath, fallback = {}) {
  const full = path.join(root, relativePath);

  try {
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[ch]));
}

function check(checks, name, pass, details = {}) {
  checks.push({ name, pass: Boolean(pass), details });
}

function humanize(value) {
  return String(value || "UNKNOWN")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const config = readJson(files.config);
const stabilization = readJson(files.stabilization);
const launch = readJson(files.launch);
const trust = readJson(files.trust);
const restrictedOps = readJson(files.restrictedOps);
const execution = readJson(files.execution);
const roadmap = readJson(files.roadmap);
const monitor = readJson(files.monitor);
const alerts = readJson(files.alerts);
const incidents = readJson(files.incidents);
const market = readJson(files.market);
const token = readJson(files.token);

const checks = [];

const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);

check(checks, "Restricted launch stabilized", stabilization.status === "RESTRICTED_LAUNCH_STABILIZED", {
  status: stabilization.status || "UNKNOWN"
});

check(checks, "Trust Center ready", trust.status === "TRUST_CENTER_READY", {
  status: trust.status || "UNKNOWN"
});

check(checks, "Mainnet monitor passing", monitor.status === "PASS", {
  status: monitor.status || "UNKNOWN"
});

check(checks, "No active incidents", activeIncidents === 0, {
  activeIncidents
});

check(checks, "Alerts do not require response", responseRequired === false, {
  alertStatus: alerts.status || "UNKNOWN",
  responseRequired
});

check(checks, "Restricted operations active", restrictedOps.mode === "MAINNET_RESTRICTED_OPERATION", {
  mode: restrictedOps.mode || "UNKNOWN"
});

check(checks, "Execution queue disabled", execution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: execution.mode || "UNKNOWN"
});

check(checks, "Capability roadmap ready", roadmap.status === "CAPABILITY_ROADMAP_READY", {
  status: roadmap.status || "UNKNOWN"
});

check(checks, "Token metadata published", Boolean(token.address && token.logoURI), {
  address: token.address || "",
  logoURI: token.logoURI || ""
});

check(checks, "Full launch not yet approved", config.fullLaunchApproved === false, {
  fullLaunchApproved: config.fullLaunchApproved
});

for (const [key, value] of Object.entries(config.capabilityApprovals || {})) {
  check(checks, `Capability still disabled: ${key}`, value === false, {
    value
  });
}

const readiness = config.requiredBeforeFullLaunch || {};
for (const [key, value] of Object.entries(readiness)) {
  if (key === "restrictedLaunchStabilized") {
    check(checks, `Required full-launch item: ${key}`, value === true, { value });
  } else {
    check(checks, `Full-launch item still pending: ${key}`, value === false, { value });
  }
}

const failures = checks.filter((item) => !item.pass);

const pendingItems = Object.entries(readiness)
  .filter(([key, value]) => key !== "restrictedLaunchStabilized" && value !== true)
  .map(([key]) => key);

const status = failures.length === 0
  ? "FULL_LAUNCH_READINESS_TRACK_OPEN_PLANNING_ONLY"
  : "FULL_LAUNCH_READINESS_REVIEW_REQUIRED";

const report = {
  schema: "astra-full-launch-readiness-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  fullLaunchApproved: false,
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    "AstraTreasury restricted Base Mainnet launch is stabilized. Full launch is not approved. Public token sale, real treasury funding, staking/rewards, buybacks, autonomous execution, paper-to-on-chain automation, and mainnet execution queue activation remain disabled.",
  summary: {
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    pendingFullLaunchItems: pendingItems.length,
    activeIncidents,
    responseRequired
  },
  currentStatuses: {
    stabilization: stabilization.status || "UNKNOWN",
    restrictedLaunch: launch.status || "UNKNOWN",
    trustCenter: trust.status || "UNKNOWN",
    monitor: monitor.status || "UNKNOWN",
    alerts: alerts.status || "UNKNOWN",
    incidents: incidents.status || "UNKNOWN",
    restrictedOperations: restrictedOps.mode || "UNKNOWN",
    executionQueue: execution.mode || "UNKNOWN",
    roadmap: roadmap.status || "UNKNOWN",
    market: market.status || "UNKNOWN"
  },
  capabilityApprovals: config.capabilityApprovals || {},
  requiredBeforeFullLaunch: readiness,
  pendingItems,
  checks,
  failures,
  restrictions: {
    publicTokenSale: false,
    realTreasuryFunding: false,
    stakingOrRewards: false,
    buybackProgram: false,
    autonomousExecution: false,
    mainnetExecutionQueue: false,
    paperToOnchainAutomation: false
  },
  nextPossibleMilestones: [
    "Legal full-launch review package",
    "Treasury funding readiness gate",
    "Execution queue dry run package",
    "Public disclosure update package",
    "Full-launch governance decision package"
  ],
  safety: {
    sendsTransactions: false,
    movesFunds: false,
    enablesExecution: false,
    approvesPublicSale: false,
    approvesTreasuryFunding: false
  }
};

writeJson(reportFile, report);

writeJson(publicJsonFile, {
  schema: "astra-public-full-launch-readiness-status-v0.1",
  generatedAt: report.generatedAt,
  status: report.status,
  currentApprovedMode: report.currentApprovedMode,
  fullLaunchApproved: report.fullLaunchApproved,
  network: report.network,
  publicStatement: report.publicStatement,
  summary: report.summary,
  currentStatuses: report.currentStatuses,
  capabilityApprovals: report.capabilityApprovals,
  requiredBeforeFullLaunch: report.requiredBeforeFullLaunch,
  pendingItems: report.pendingItems,
  restrictions: report.restrictions,
  nextPossibleMilestones: report.nextPossibleMilestones
});

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const pendingRows = pendingItems.length === 0
  ? '<tr><td colspan="2">No pending items.</td></tr>'
  : pendingItems.map((item) => `<tr><td>${escapeHtml(item)}</td><td>Pending separate approval</td></tr>`).join("");

const capabilityRows = Object.entries(report.capabilityApprovals).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Approved" : "Not approved"}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Full Launch Readiness</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #08111f;
      --surface: #0e1a2b;
      --border: rgba(148, 163, 184, 0.2);
      --text: #edf4fb;
      --muted: #9aaec4;
      --blue: #67a7ff;
      --green: #41d49b;
      --yellow: #f4c35f;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    body { margin: 0; background: linear-gradient(180deg, #07101d, var(--bg)); color: var(--text); }
    a { color: var(--blue); text-decoration: none; }

    main {
      width: min(1120px, calc(100% - 40px));
      margin: 0 auto;
      padding: 44px 0 72px;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 28px;
      box-shadow: 0 22px 70px rgba(0,0,0,.28);
      margin-bottom: 18px;
    }

    h1 { margin: 0 0 10px; font-size: 42px; letter-spacing: -1.2px; }
    h2 { margin: 0 0 14px; font-size: 24px; }
    p { color: var(--muted); line-height: 1.65; }

    .badge {
      display: inline-flex;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(244,195,95,.08);
      border: 1px solid rgba(244,195,95,.22);
      color: var(--yellow);
      font-weight: 850;
      margin-bottom: 16px;
    }

    .stats {
      margin-top: 24px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }

    .stat {
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 18px;
      background: rgba(255,255,255,.03);
    }

    .label { color: var(--muted); font-size: 13px; margin-bottom: 8px; }
    .value { font-size: 24px; font-weight: 850; }

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

    .notice {
      padding: 16px;
      border-radius: 16px;
      background: rgba(244,195,95,.08);
      border: 1px solid rgba(244,195,95,.22);
      color: #f7d99a;
      line-height: 1.6;
    }

    @media (max-width: 850px) {
      .stats { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
<main>
  <section class="card">
    <div class="badge">Planning only · full launch not approved</div>
    <h1>Full Launch Readiness</h1>
    <p>${escapeHtml(report.publicStatement)}</p>

    <div class="stats">
      <div class="stat"><div class="label">Approved mode</div><div class="value">Restricted</div></div>
      <div class="stat"><div class="label">Checks</div><div class="value">${report.summary.passed}/${report.summary.totalChecks}</div></div>
      <div class="stat"><div class="label">Pending items</div><div class="value">${report.summary.pendingFullLaunchItems}</div></div>
      <div class="stat"><div class="label">Full launch</div><div class="value">Not approved</div></div>
    </div>
  </section>

  <section class="card">
    <h2>Current status</h2>
    <table>
      <thead><tr><th>Area</th><th>Status</th></tr></thead>
      <tbody>${statusRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Pending full-launch items</h2>
    <table>
      <thead><tr><th>Item</th><th>Status</th></tr></thead>
      <tbody>${pendingRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Capability approvals</h2>
    <table>
      <thead><tr><th>Capability</th><th>Status</th></tr></thead>
      <tbody>${capabilityRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      Full launch readiness does not approve a public token sale, real treasury funding, staking/rewards,
      buybacks, autonomous execution, paper-to-on-chain automation, or mainnet execution queue activation.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/full-launch">/api/public/full-launch</a></p>
    <p><a href="/stabilization">Restricted launch stabilization</a></p>
    <p><a href="/roadmap">Capability roadmap</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Full Launch Readiness");
console.log("===================================");
console.log(`Status: ${report.status}`);
console.log(`Checks passed: ${report.summary.passed}/${report.summary.totalChecks}`);
console.log(`Pending full-launch items: ${pendingItems.length}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
