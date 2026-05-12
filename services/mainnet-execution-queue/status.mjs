import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const queueConfigFile = path.join(root, "configs", "mainnet-execution-queue.config.json");
const restrictedConfigFile = path.join(root, "configs", "restricted-operations.config.json");
const mainnetManifestFile = path.join(root, "deployments", "base-mainnet.public.json");
const postdeployReportFile = path.join(root, "reports", "mainnet-postdeploy", "mainnet-postdeploy-check-v1.json");
const monitorReportFile = path.join(root, "reports", "mainnet-monitor", "latest-mainnet-monitor.json");

const reportDir = path.join(root, "reports", "mainnet-execution-queue");
const reportFile = path.join(reportDir, "status.json");

const publicJsonFile = path.join(root, "public-docs", "mainnet-execution-status.json");
const publicHtmlFile = path.join(root, "public-docs", "mainnet-execution.html");
const publicDocFile = path.join(root, "docs", "mainnet-live", "MAINNET_EXECUTION_QUEUE_STATUS.md");

fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(path.dirname(publicJsonFile), { recursive: true });
fs.mkdirSync(path.dirname(publicDocFile), { recursive: true });

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

const queueConfig = readJson(queueConfigFile, {});
const restrictedConfig = readJson(restrictedConfigFile, {});
const manifest = readJson(mainnetManifestFile, {});
const postdeploy = readJson(postdeployReportFile, {});
const monitor = readJson(monitorReportFile, {});

const checks = [];

const queue = queueConfig.queue || {};
const hardStops = queueConfig.hardStops || {};
const restricted = restrictedConfig.restrictedCapabilities || {};

check(checks, "Base Mainnet public manifest exists", Boolean(manifest.contracts), {
  hasContracts: Boolean(manifest.contracts)
});

check(checks, "Post-deployment verification passed", postdeploy.status === "PASS", {
  status: postdeploy.status || "UNKNOWN"
});

check(checks, "Mainnet monitor passing or available", monitor.status === "PASS", {
  status: monitor.status || "UNKNOWN"
});

check(checks, "Mainnet execution queue disabled", queue.enabled === false, {
  enabled: queue.enabled
});

check(checks, "Paper-to-on-chain automation disabled", queue.paperToOnchainAutomationEnabled === false, {
  paperToOnchainAutomationEnabled: queue.paperToOnchainAutomationEnabled
});

check(checks, "Autonomous execution disabled", queue.autonomousExecutionEnabled === false, {
  autonomousExecutionEnabled: queue.autonomousExecutionEnabled
});

check(checks, "Manual execution approval required", queue.manualExecutionApprovalRequired === true, {
  manualExecutionApprovalRequired: queue.manualExecutionApprovalRequired
});

check(checks, "Governance Safe approval required", queue.governanceSafeApprovalRequired === true, {
  governanceSafeApprovalRequired: queue.governanceSafeApprovalRequired
});

for (const [key, value] of Object.entries(hardStops)) {
  check(checks, `hard stop remains false: ${key}`, value === false, { value });
}

for (const key of [
  "publicTokenSaleApproved",
  "realTreasuryFundingApproved",
  "stakingOrRewardsApproved",
  "buybackProgramApproved",
  "autonomousExecutionApproved",
  "mainnetExecutionQueueEnabled",
  "mainnetPaperToOnchainAutomationEnabled"
]) {
  check(checks, `restricted flag remains false: ${key}`, restricted[key] === false, {
    value: restricted[key]
  });
}

const failures = checks.filter((item) => !item.pass);

const status = {
  schema: "astra-mainnet-execution-queue-status-v0.1",
  generatedAt: new Date().toISOString(),
  status: failures.length === 0 ? "PASS" : "FAIL",
  mode: "MAINNET_EXECUTION_QUEUE_DISABLED",
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    "AstraTreasury mainnet execution queue is disabled. No real treasury execution, paper-to-on-chain automation, autonomous execution, public sale, staking/rewards, or buyback program is approved.",
  queue,
  hardStops,
  restrictedCapabilities: restricted,
  activationRequirements: queueConfig.activationRequirements || [],
  summary: {
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length
  },
  checks,
  failures,
  safety: {
    sendsTransactions: false,
    movesFunds: false,
    enablesExecution: false,
    approvesPublicSale: false,
    approvesTreasuryFunding: false
  }
};

writeJson(reportFile, status);
writeJson(publicJsonFile, {
  schema: "astra-public-mainnet-execution-queue-status-v0.1",
  generatedAt: status.generatedAt,
  status: status.status,
  mode: status.mode,
  network: status.network,
  publicStatement: status.publicStatement,
  queue: status.queue,
  hardStops: status.hardStops,
  restrictedCapabilities: status.restrictedCapabilities,
  summary: status.summary,
  failures: status.failures
});

const checkRows = checks.map((item) => {
  return `<tr><td>${escapeHtml(item.name)}</td><td>${item.pass ? "PASS" : "FAIL"}</td></tr>`;
}).join("");

const requirementRows = status.activationRequirements.map((item) => {
  return `<tr><td>${escapeHtml(item)}</td><td>required before activation</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Mainnet Execution Queue</title>
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
    .fail { color: #f85149; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; border-bottom: 1px solid #30363d; padding: 10px 8px; }
    th { color: #58a6ff; font-size: 13px; }
    td { font-size: 13px; overflow-wrap: anywhere; }
  </style>
</head>
<body>
<header>
  <h1>AstraTreasury Mainnet Execution Queue</h1>
  <div class="muted">Public restricted execution status. Sanitized and read-only.</div>
</header>
<main>
  <section class="card">
    <h2>Status</h2>
    <div class="big ${status.status === "PASS" ? "ok" : "fail"}">${escapeHtml(status.mode)}</div>
    <p>${escapeHtml(status.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Activation Requirements</h2>
    <table>
      <thead><tr><th>Requirement</th><th>Status</th></tr></thead>
      <tbody>${requirementRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Checks</h2>
    <table>
      <thead><tr><th>Check</th><th>Status</th></tr></thead>
      <tbody>${checkRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/mainnet-execution">/api/public/mainnet-execution</a></p>
    <p><a href="/monitor">Mainnet monitor</a></p>
    <p><a href="/restricted-operations">Restricted operations</a></p>
    <p><a href="/">Back to public site</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

const md = [
  "# Mainnet Execution Queue Status",
  "",
  `Status: ${status.mode}`,
  "",
  status.publicStatement,
  "",
  "## Checks",
  "",
  ...checks.map((item) => `- ${item.name}: ${item.pass ? "PASS" : "FAIL"}`),
  "",
  "## Rule",
  "",
  "No mainnet treasury execution is approved while this queue is disabled."
];

fs.writeFileSync(publicDocFile, md.join("\n") + "\n");

console.log("AstraTreasury Mainnet Execution Queue Status");
console.log("===========================================");
console.log(`Status: ${status.status}`);
console.log(`Mode: ${status.mode}`);
console.log(`Checks passed: ${status.summary.passed}/${status.summary.totalChecks}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({ name: item.name, details: JSON.stringify(item.details) })));
  process.exit(1);
}
