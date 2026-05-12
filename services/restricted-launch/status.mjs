import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const files = {
  config: "configs/restricted-launch.config.json",
  mainnetManifest: "deployments/base-mainnet.public.json",
  postdeploy: "reports/mainnet-postdeploy/mainnet-postdeploy-check-v1.json",
  mainnetMonitor: "reports/mainnet-monitor/latest-mainnet-monitor.json",
  eventMonitor: "reports/mainnet-event-monitor/latest-mainnet-event-monitor.json",
  alerts: "reports/mainnet-alerts/latest-mainnet-alerts.json",
  incidents: "public-docs/incident-summary.json",
  restrictedOps: "public-docs/restricted-operations-status.json",
  executionQueue: "public-docs/mainnet-execution-status.json",
  liveStatus: "public-docs/live-status.json"
};

const reportDir = path.join(root, "reports", "restricted-launch");
const reportFile = path.join(reportDir, "restricted-launch-status.json");
const publicJsonFile = path.join(root, "public-docs", "restricted-launch-status.json");
const publicHtmlFile = path.join(root, "public-docs", "launch.html");
const publicDocFile = path.join(root, "docs", "mainnet-live", "RESTRICTED_LAUNCH_STATUS.md");

fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(path.dirname(publicJsonFile), { recursive: true });
fs.mkdirSync(path.dirname(publicDocFile), { recursive: true });

function readJson(relativePath, fallback = {}) {
  const fullPath = path.join(root, relativePath);

  try {
    if (!fs.existsSync(fullPath)) return fallback;
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function check(checks, name, pass, details = {}) {
  checks.push({ name, pass: Boolean(pass), details });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[ch]));
}

const config = readJson(files.config);
const mainnetManifest = readJson(files.mainnetManifest);
const postdeploy = readJson(files.postdeploy);
const mainnetMonitor = readJson(files.mainnetMonitor);
const eventMonitor = readJson(files.eventMonitor);
const alerts = readJson(files.alerts);
const incidents = readJson(files.incidents);
const restrictedOps = readJson(files.restrictedOps);
const executionQueue = readJson(files.executionQueue);
const liveStatus = readJson(files.liveStatus);

const checks = [];

const alertItems = Array.isArray(alerts.alerts) ? alerts.alerts : [];
const highOrCriticalAlerts = alertItems.filter((item) => ["HIGH", "CRITICAL"].includes(String(item.severity)));

const activeIncidents = Number(incidents?.summary?.active || 0);

check(checks, "Base Mainnet manifest exists", Boolean(mainnetManifest.contracts), {
  hasContracts: Boolean(mainnetManifest.contracts)
});

check(checks, "Post-deployment verification passed", postdeploy.status === "PASS", {
  status: postdeploy.status || "UNKNOWN"
});

check(checks, "Mainnet operational monitor passing", mainnetMonitor.status === "PASS", {
  status: mainnetMonitor.status || "UNKNOWN"
});

check(checks, "Mainnet event monitor has no high/critical alerts", highOrCriticalAlerts.length === 0, {
  highOrCriticalAlerts: highOrCriticalAlerts.length,
  eventMonitorStatus: eventMonitor.status || "UNKNOWN"
});

check(checks, "Alert status does not require response", alerts.responseRequired !== true, {
  alertStatus: alerts.status || "UNKNOWN",
  responseRequired: alerts.responseRequired
});

check(checks, "No active incidents", activeIncidents === 0, {
  activeIncidents
});

check(checks, "Restricted operations status generated", restrictedOps.mode === "MAINNET_RESTRICTED_OPERATION", {
  mode: restrictedOps.mode || "UNKNOWN"
});

check(checks, "Mainnet execution queue disabled", executionQueue.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: executionQueue.mode || "UNKNOWN"
});

const restrictedCapabilities = restrictedOps.restrictedCapabilities || {};
const mustRemainDisabled = config.restrictedCapabilitiesMustRemainDisabled || [];

for (const key of mustRemainDisabled) {
  check(checks, `restricted capability disabled: ${key}`, restrictedCapabilities[key] === false, {
    value: restrictedCapabilities[key]
  });
}

const failures = checks.filter((item) => !item.pass);

const status = failures.length === 0
  ? "RESTRICTED_LAUNCH_READY"
  : "RESTRICTED_LAUNCH_REVIEW_REQUIRED";

const report = {
  schema: "astra-restricted-launch-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  mode: "BASE_MAINNET_RESTRICTED_OPERATION",
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    failures.length === 0
      ? "AstraTreasury Base Mainnet contracts are deployed, verified, monitored, and operating in restricted mode. Public sale, treasury funding, staking/rewards, buybacks, autonomous execution, and mainnet execution queue activation remain disabled."
      : "AstraTreasury restricted launch status requires operator review before being considered ready.",
  summary: {
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    highOrCriticalAlerts: highOrCriticalAlerts.length,
    activeIncidents
  },
  checks,
  failures,
  restrictions: {
    publicTokenSale: false,
    realTreasuryFunding: false,
    stakingOrRewards: false,
    buybackProgram: false,
    autonomousExecution: false,
    mainnetExecutionQueue: false
  },
  pages: {
    mainnet: "/mainnet",
    live: "/live",
    monitor: "/monitor",
    events: "/mainnet-events",
    alerts: "/alerts",
    incidents: "/incidents",
    execution: "/mainnet-execution",
    restrictedOperations: "/restricted-operations",
    launch: "/launch"
  },
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
  schema: "astra-public-restricted-launch-status-v0.1",
  generatedAt: report.generatedAt,
  status: report.status,
  mode: report.mode,
  network: report.network,
  publicStatement: report.publicStatement,
  summary: report.summary,
  restrictions: report.restrictions,
  failures: report.failures,
  pages: report.pages
});

const checkRows = checks.map((item) => {
  return `<tr><td>${escapeHtml(item.name)}</td><td>${item.pass ? "PASS" : "FAIL"}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Restricted Launch Status</title>
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
    .ok { color: #3fb950; font-weight: 700; }
    .warn { color: #d29922; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; border-bottom: 1px solid #30363d; padding: 10px 8px; }
    th { color: #58a6ff; font-size: 13px; }
    td { font-size: 13px; overflow-wrap: anywhere; }
  </style>
</head>
<body>
<header>
  <h1>AstraTreasury Restricted Launch Status</h1>
  <div class="muted">Public restricted-launch status. Sanitized and read-only.</div>
</header>
<main>
  <section class="card">
    <h2>Status</h2>
    <div class="big ${report.status === "RESTRICTED_LAUNCH_READY" ? "ok" : "warn"}">${escapeHtml(report.status)}</div>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Checks</h2>
    <table>
      <thead><tr><th>Check</th><th>Status</th></tr></thead>
      <tbody>${checkRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Still Disabled</h2>
    <p>Public sale, real treasury funding, staking/rewards, buybacks, autonomous execution, and mainnet execution queue activation remain disabled.</p>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/launch">/api/public/launch</a></p>
    <p><a href="/live">Mainnet live status</a></p>
    <p><a href="/">Back to public site</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

const md = [
  "# Restricted Launch Status",
  "",
  `Status: ${report.status}`,
  "",
  report.publicStatement,
  "",
  "## Checks",
  "",
  ...checks.map((item) => `- ${item.name}: ${item.pass ? "PASS" : "FAIL"}`),
  "",
  "## Restrictions",
  "",
  "- Public token sale: disabled",
  "- Real treasury funding: disabled",
  "- Staking/rewards: disabled",
  "- Buyback program: disabled",
  "- Autonomous execution: disabled",
  "- Mainnet execution queue: disabled"
];

fs.writeFileSync(publicDocFile, md.join("\n") + "\n");

console.log("AstraTreasury Restricted Launch Status");
console.log("======================================");
console.log(`Status: ${report.status}`);
console.log(`Checks passed: ${report.summary.passed}/${report.summary.totalChecks}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({ name: item.name, details: JSON.stringify(item.details) })));
  process.exit(1);
}
