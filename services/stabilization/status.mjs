import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const files = {
  config: "configs/restricted-launch-stabilization.config.json",
  mainnetManifest: "deployments/base-mainnet.public.json",
  postdeploy: "reports/mainnet-postdeploy/mainnet-postdeploy-check-v1.json",
  live: "public-docs/live-status.json",
  restrictedOps: "public-docs/restricted-operations-status.json",
  executionQueue: "public-docs/mainnet-execution-status.json",
  mainnetMonitor: "public-docs/mainnet-monitor-status.json",
  eventMonitor: "public-docs/mainnet-event-monitor-status.json",
  alerts: "public-docs/mainnet-alerts-status.json",
  incidents: "public-docs/incident-summary.json",
  announcementPublication: "public-docs/announcement-publication-status.json",
  postAnnouncement: "public-docs/post-announcement-status.json",
  evidence: "public-docs/evidence-index.json",
  launch: "public-docs/restricted-launch-status.json"
};

const reportDir = path.join(root, "reports", "stabilization");
const reportFile = path.join(reportDir, "restricted-launch-stabilization-status.json");

const publicJsonFile = path.join(root, "public-docs", "stabilization-status.json");
const publicHtmlFile = path.join(root, "public-docs", "stabilization.html");
const publicDocFile = path.join(root, "docs", "stabilization", "RESTRICTED_LAUNCH_STABILIZATION_STATUS.md");

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
const live = readJson(files.live);
const restrictedOps = readJson(files.restrictedOps);
const executionQueue = readJson(files.executionQueue);
const mainnetMonitor = readJson(files.mainnetMonitor);
const eventMonitor = readJson(files.eventMonitor);
const alerts = readJson(files.alerts);
const incidents = readJson(files.incidents);
const announcementPublication = readJson(files.announcementPublication);
const postAnnouncement = readJson(files.postAnnouncement);
const evidence = readJson(files.evidence);
const launch = readJson(files.launch);

const checks = [];

const highOrCriticalEventAlerts = Number(eventMonitor?.summary?.highOrCriticalAlerts || 0);
const activeIncidents = Number(incidents?.summary?.active || 0);
const evidenceSnapshots = Number(evidence?.snapshotCount || 0);

check(checks, "Base Mainnet manifest exists", Boolean(mainnetManifest.contracts), {
  hasContracts: Boolean(mainnetManifest.contracts)
});

check(checks, "Post-deployment verification passed", postdeploy.status === "PASS", {
  status: postdeploy.status || "UNKNOWN"
});

check(checks, "Restricted launch ready", launch.status === "RESTRICTED_LAUNCH_READY", {
  status: launch.status || "UNKNOWN"
});

check(checks, "Live status is restricted operation", String(live.liveStatus || live.status || "").includes("RESTRICTED"), {
  liveStatus: live.liveStatus || live.status || "UNKNOWN"
});

check(checks, "Restricted operations mode active", restrictedOps.mode === "MAINNET_RESTRICTED_OPERATION", {
  mode: restrictedOps.mode || "UNKNOWN"
});

check(checks, "Execution queue disabled", executionQueue.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: executionQueue.mode || "UNKNOWN"
});

check(checks, "Mainnet monitor passing", mainnetMonitor.status === "PASS", {
  status: mainnetMonitor.status || "UNKNOWN"
});

check(checks, "Event monitor has no high/critical alerts", highOrCriticalEventAlerts === 0 && !["FAIL", "ERROR"].includes(String(eventMonitor.status || "")), {
  eventStatus: eventMonitor.status || "UNKNOWN",
  highOrCriticalEventAlerts
});

check(checks, "Alerts require no response", alerts.responseRequired !== true, {
  alertStatus: alerts.status || "UNKNOWN",
  responseRequired: alerts.responseRequired
});

check(checks, "No active incidents", activeIncidents === 0, {
  activeIncidents
});

check(checks, "Announcement publication monitored", ["ANNOUNCEMENT_POSTED_AND_MONITORED", "READY_FOR_REVIEWED_PUBLIC_POSTING"].includes(String(announcementPublication.status || "")), {
  status: announcementPublication.status || "UNKNOWN",
  announcementPosted: announcementPublication.announcementPosted
});

check(checks, "Post-announcement window complete", postAnnouncement.status === "POST_ANNOUNCEMENT_WINDOW_COMPLETE", {
  status: postAnnouncement.status || "UNKNOWN",
  window: postAnnouncement.window || null
});

check(checks, "Evidence snapshots exist", evidenceSnapshots > 0, {
  evidenceSnapshots
});

const restrictedCapabilities = restrictedOps.restrictedCapabilities || {};
const disabledKeys = [
  "publicTokenSaleApproved",
  "realTreasuryFundingApproved",
  "stakingOrRewardsApproved",
  "buybackProgramApproved",
  "autonomousExecutionApproved",
  "mainnetExecutionQueueEnabled",
  "mainnetPaperToOnchainAutomationEnabled"
];

for (const key of disabledKeys) {
  check(checks, `restricted capability remains disabled: ${key}`, restrictedCapabilities[key] === false, {
    value: restrictedCapabilities[key]
  });
}

const failures = checks.filter((item) => !item.pass);

const status = failures.length === 0
  ? "RESTRICTED_LAUNCH_STABILIZED"
  : "RESTRICTED_LAUNCH_STABILIZATION_REVIEW_REQUIRED";

const report = {
  schema: "astra-restricted-launch-stabilization-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  mode: "BASE_MAINNET_RESTRICTED_OPERATION",
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    failures.length === 0
      ? "AstraTreasury restricted Base Mainnet deployment is stabilized: contracts are deployed, verified, monitored, announcement monitoring is complete, and restricted capabilities remain disabled."
      : "AstraTreasury restricted launch stabilization requires operator review.",
  summary: {
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    evidenceSnapshots,
    activeIncidents,
    highOrCriticalEventAlerts
  },
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
  nextCapabilitiesRequireSeparateApproval: [
    "public token sale",
    "real treasury funding",
    "staking or rewards",
    "buyback program",
    "mainnet execution queue",
    "paper-to-on-chain automation",
    "autonomous execution"
  ],
  evidence: {
    snapshotCount: evidenceSnapshots,
    latestGeneratedAt: evidence.generatedAt || null
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
  schema: "astra-public-restricted-launch-stabilization-status-v0.1",
  generatedAt: report.generatedAt,
  status: report.status,
  mode: report.mode,
  network: report.network,
  publicStatement: report.publicStatement,
  summary: report.summary,
  restrictions: report.restrictions,
  failures: report.failures,
  nextCapabilitiesRequireSeparateApproval: report.nextCapabilitiesRequireSeparateApproval
});

const checkRows = checks.map((item) => {
  return `<tr><td>${escapeHtml(item.name)}</td><td>${item.pass ? "PASS" : "FAIL"}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Restricted Launch Stabilization</title>
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
    .big { font-size: 26px; font-weight: 700; color: ${status === "RESTRICTED_LAUNCH_STABILIZED" ? "#3fb950" : "#d29922"}; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; border-bottom: 1px solid #30363d; padding: 10px 8px; }
    th { color: #58a6ff; font-size: 13px; }
    td { font-size: 13px; overflow-wrap: anywhere; }
  </style>
</head>
<body>
<header>
  <h1>AstraTreasury Restricted Launch Stabilization</h1>
  <div class="muted">Public stabilization report. Sanitized and read-only.</div>
</header>
<main>
  <section class="card">
    <h2>Status</h2>
    <div class="big">${escapeHtml(status)}</div>
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
    <p>Public token sale, real treasury funding, staking/rewards, buybacks, autonomous execution, mainnet execution queue, and paper-to-on-chain automation remain disabled.</p>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/stabilization">/api/public/stabilization</a></p>
    <p><a href="/launch">Restricted launch status</a></p>
    <p><a href="/transparency">Transparency index</a></p>
    <p><a href="/">Back to public site</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

const md = [
  "# Restricted Launch Stabilization Status",
  "",
  `Status: ${report.status}`,
  "",
  report.publicStatement,
  "",
  "## Checks",
  "",
  ...checks.map((item) => `- ${item.name}: ${item.pass ? "PASS" : "FAIL"}`),
  "",
  "## Still disabled",
  "",
  "- Public token sale",
  "- Real treasury funding",
  "- Staking/rewards",
  "- Buyback program",
  "- Autonomous execution",
  "- Mainnet execution queue",
  "- Paper-to-on-chain automation"
];

fs.writeFileSync(publicDocFile, md.join("\n") + "\n");

console.log("AstraTreasury Restricted Launch Stabilization");
console.log("============================================");
console.log(`Status: ${report.status}`);
console.log(`Checks passed: ${report.summary.passed}/${report.summary.totalChecks}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 300)
  })));
  process.exit(1);
}
