import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const reportDir = path.join(root, "reports", "dex-liquidity-path");
const reportFile = path.join(reportDir, "dex-liquidity-path-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-liquidity-path-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-liquidity-path.html");

fs.mkdirSync(reportDir, { recursive: true });

const dexArtifactPaths = [
  "configs/dex-liquidity-path-selection.config.json",
  "docs/dex-liquidity-path/DEX_LIQUIDITY_PATH_SELECTION.md",
  "docs/dex-liquidity-path/DEX_LIQUIDITY_PATH_BOUNDARIES.md",
  "docs/dex-liquidity-path/DEX_LIQUIDITY_PARAMETER_CHECKLIST.md",
  "docs/dex-liquidity-path/DEX_LIQUIDITY_RISK_NOTES.md",
  "public-docs/capability-request-review-status.json",
  "public-docs/capability-request-import-status.json",
  "public-docs/capability-activation-intake-status.json",
  "public-docs/restricted-mode-operator-checklist-status.json",
  "public-docs/restricted-mode-maintenance-schedule-status.json",
  "public-docs/restricted-mode-final-release-status.json",
  "public-docs/governance-decision-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/treasury-safe-transaction-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-alerts-status.json",
  "public-docs/incident-summary.json",
  "public-docs/mainnet-execution-status.json"
];

function readJson(relativePath, fallback = {}) {
  try {
    const full = path.join(root, relativePath);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sha256File(relativePath) {
  const full = path.join(root, relativePath);
  const buffer = fs.readFileSync(full);

  return {
    path: relativePath,
    bytes: buffer.length,
    sha256: sha256Buffer(buffer)
  };
}

function sha256Json(value) {
  return sha256Buffer(Buffer.from(JSON.stringify(value, null, 2) + "\n"));
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

function humanize(value) {
  return String(value || "UNKNOWN")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function check(checks, name, pass, details = {}) {
  checks.push({ name, pass: Boolean(pass), details });
}

const config = readJson("configs/dex-liquidity-path-selection.config.json");
const requestReview = readJson("public-docs/capability-request-review-status.json");
const requestImport = readJson("public-docs/capability-request-import-status.json");
const intake = readJson("public-docs/capability-activation-intake-status.json");
const operatorChecklist = readJson("public-docs/restricted-mode-operator-checklist-status.json");
const maintenanceSchedule = readJson("public-docs/restricted-mode-maintenance-schedule-status.json");
const finalRelease = readJson("public-docs/restricted-mode-final-release-status.json");
const governanceDecision = readJson("public-docs/governance-decision-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const treasurySafeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);

const checks = [];

check(checks, "DEX/liquidity path selected", config.selectedPublicPurchasePath?.id === "dex-liquidity-pool-trading" && config.pathSelectionRecorded === true, {
  selectedPublicPurchasePath: config.selectedPublicPurchasePath?.id,
  pathSelectionRecorded: config.pathSelectionRecorded
});

check(checks, "Path selection only", config.pathSelectionOnly === true, {
  pathSelectionOnly: config.pathSelectionOnly
});

check(checks, "DEX path not approved", config.dexPathApproved === false, {
  dexPathApproved: config.dexPathApproved
});

check(checks, "Pool creation not approved", config.liquidityPoolCreationApproved === false, {
  liquidityPoolCreationApproved: config.liquidityPoolCreationApproved
});

check(checks, "Liquidity provisioning not approved", config.liquidityProvisionApproved === false, {
  liquidityProvisionApproved: config.liquidityProvisionApproved
});

check(checks, "Public trading not approved", config.publicTradingApproved === false, {
  publicTradingApproved: config.publicTradingApproved
});

check(checks, "Safe payload not approved", config.safePayloadGenerationApproved === false, {
  safePayloadGenerationApproved: config.safePayloadGenerationApproved
});

check(checks, "Request review gate healthy", [
  "CAPABILITY_REQUEST_REVIEW_GATE_READY_NO_ACTIVE_REQUEST",
  "CAPABILITY_REQUEST_REVIEW_READY_TO_OPEN_ACTION_PATH_NO_APPROVAL"
].includes(requestReview.status), {
  status: requestReview.status || "UNKNOWN"
});

check(checks, "Request import gate healthy", [
  "CAPABILITY_REQUEST_IMPORT_TEMPLATE_READY_NO_ACTIVE_REQUEST",
  "CAPABILITY_REQUEST_IMPORTED_FOR_REVIEW_NO_APPROVAL"
].includes(requestImport.status), {
  status: requestImport.status || "UNKNOWN"
});

check(checks, "Capability intake gate healthy", [
  "CAPABILITY_ACTIVATION_INTAKE_GATE_READY_NO_ACTIVE_REQUEST",
  "CAPABILITY_ACTIVATION_INTAKE_REQUEST_IMPORTED_PENDING_REVIEW"
].includes(intake.status), {
  status: intake.status || "UNKNOWN"
});

check(checks, "Operator checklist ready", operatorChecklist.status === "RESTRICTED_MODE_OPERATOR_CHECKLIST_READY_DECISION_RECORDED_ALL_DISABLED", {
  status: operatorChecklist.status || "UNKNOWN"
});

check(checks, "Maintenance schedule ready", maintenanceSchedule.status === "RESTRICTED_MODE_MAINTENANCE_SCHEDULE_READY_DECISION_RECORDED_ALL_DISABLED", {
  status: maintenanceSchedule.status || "UNKNOWN"
});

check(checks, "Restricted-mode final release ready", finalRelease.status === "RESTRICTED_MODE_FINAL_RELEASE_READY_DECISION_RECORDED_ALL_DISABLED", {
  status: finalRelease.status || "UNKNOWN"
});

check(checks, "Governance decision recorded", governanceDecision.governanceDecisionRecorded === true, {
  governanceDecisionRecorded: governanceDecision.governanceDecisionRecorded
});

check(checks, "Capability Matrix all-disabled", capabilityMatrix.allCapabilitiesDisabled === true && capabilityMatrix.allCapabilityApprovalsFalse === true, {
  allCapabilitiesDisabled: capabilityMatrix.allCapabilitiesDisabled,
  allCapabilityApprovalsFalse: capabilityMatrix.allCapabilityApprovalsFalse
});

check(checks, "Mainnet monitor passing", monitor.status === "PASS", {
  status: monitor.status || "UNKNOWN"
});

check(checks, "Alerts do not require response", responseRequired === false, {
  responseRequired
});

check(checks, "No active incidents", activeIncidents === 0, {
  activeIncidents
});

check(checks, "Execution queue disabled", execution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: execution.mode || "UNKNOWN"
});

check(checks, "Full launch not approved", fullLaunch.fullLaunchApproved === false && config.fullLaunchApproved === false, {
  fullLaunchApproved: fullLaunch.fullLaunchApproved,
  configFullLaunchApproved: config.fullLaunchApproved
});

check(checks, "Treasury funding not approved", treasuryFunding.treasuryFundingApproved === false && config.treasuryFundingApproved === false, {
  treasuryFundingApproved: treasuryFunding.treasuryFundingApproved,
  configTreasuryFundingApproved: config.treasuryFundingApproved
});

check(checks, "Treasury funding not executed", treasuryFunding.treasuryFundingExecuted === false, {
  treasuryFundingExecuted: treasuryFunding.treasuryFundingExecuted
});

check(checks, "Safe payload not generated", treasurySafeTx.safeTransactionPayloadGenerated === false, {
  safeTransactionPayloadGenerated: treasurySafeTx.safeTransactionPayloadGenerated
});

check(checks, "Safe transaction not prepared", treasurySafeTx.safeTransactionPrepared === false, {
  safeTransactionPrepared: treasurySafeTx.safeTransactionPrepared
});

const missingArtifacts = dexArtifactPaths.filter((artifactPath) => {
  return !fs.existsSync(path.join(root, artifactPath));
});

for (const artifactPath of missingArtifacts) {
  check(checks, `DEX path artifact exists: ${artifactPath}`, false, { artifactPath });
}

const artifactHashes = dexArtifactPaths
  .filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)))
  .map((artifactPath) => sha256File(artifactPath));

const payload = {
  schema: "astra-dex-liquidity-path-selection-payload-v0.1",
  currentApprovedMode: "restricted-mainnet-operation",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  pathSelectionOnly: true,
  artifactHashes
};

const dexPathHash = sha256Json(payload);
const failures = checks.filter((item) => !item.pass);

const status = failures.length === 0
  ? "DEX_LIQUIDITY_PATH_SELECTED_NOT_APPROVED"
  : "DEX_LIQUIDITY_PATH_REVIEW_REQUIRED";

const report = {
  schema: "astra-dex-liquidity-path-selection-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  selectedPublicPurchasePath: config.selectedPublicPurchasePath || {},
  publicStatement:
    "AstraTreasury has selected DEX/liquidity-pool trading as the preferred future public purchase path. This path is not approved, no pool is created, no liquidity is added, no Safe payload is generated, and full launch remains not approved.",
  summary: {
    artifactCount: artifactHashes.length,
    missingArtifactCount: missingArtifacts.length,
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    activeIncidents,
    responseRequired,
    monitorStatus: monitor.status || "UNKNOWN"
  },
  dexPath: {
    dexPathHash,
    hashAlgorithm: "SHA-256",
    candidatePairs: config.candidatePairs || [],
    pendingDecisions: config.pendingDecisions || {},
    capabilityBoundaries: config.capabilityBoundaries || {},
    artifactHashes
  },
  checks,
  failures,
  missingArtifacts,
  currentStatuses: {
    capabilityRequestReview: requestReview.status || "UNKNOWN",
    capabilityRequestImport: requestImport.status || "UNKNOWN",
    capabilityActivationIntake: intake.status || "UNKNOWN",
    restrictedModeOperatorChecklist: operatorChecklist.status || "UNKNOWN",
    restrictedModeMaintenanceSchedule: maintenanceSchedule.status || "UNKNOWN",
    restrictedModeFinalRelease: finalRelease.status || "UNKNOWN",
    governanceDecision: governanceDecision.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    treasurySafeTransaction: treasurySafeTx.status || "UNKNOWN",
    monitor: monitor.status || "UNKNOWN",
    alerts: alerts.status || "UNKNOWN",
    incidents: incidents.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
  restrictions: {
    publicTokenSale: false,
    dexLiquidityPoolTrading: false,
    realTreasuryFunding: false,
    stakingOrRewards: false,
    buybackProgram: false,
    autonomousExecution: false,
    mainnetExecutionQueue: false,
    paperToOnchainAutomation: false,
    safeTransactionPayloadGeneration: false,
    safeTransactionExecution: false
  },
  safety: {
    sendsTransactions: false,
    movesFunds: false,
    deploysContracts: false,
    createsLiquidityPool: false,
    addsLiquidity: false,
    enablesExecution: false,
    approvesPublicSale: false,
    approvesTreasuryFunding: false,
    preparesSafeTransaction: false,
    approvesFullLaunch: false
  }
};

writeJson(reportFile, report);
writeJson(publicJsonFile, report);

const pathRows = Object.entries(report.selectedPublicPurchasePath).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const pendingRows = Object.entries(report.dexPath.pendingDecisions).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Finalized" : "Pending"}</td></tr>`;
}).join("");

const pairRows = report.dexPath.candidatePairs.map((item) => {
  return `<tr><td>${escapeHtml(item)}</td><td>Candidate only · not finalized</td></tr>`;
}).join("");

const checkRows = checks.map((item) => {
  return `<tr><td>${escapeHtml(item.name)}</td><td>${item.pass ? "PASS" : "FAIL"}</td><td><code>${escapeHtml(JSON.stringify(item.details))}</code></td></tr>`;
}).join("");

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury DEX/Liquidity Path</title>
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
      overflow-wrap: anywhere;
      font-size: 12px;
    }

    .notice {
      padding: 16px;
      border-radius: 16px;
      background: rgba(244,195,95,.08);
      border: 1px solid rgba(244,195,95,.22);
      color: #f7d99a;
      line-height: 1.6;
    }
  </style>
</head>
<body>
<main>
  <section class="card">
    <div class="badge">DEX path selected · not approved</div>
    <h1>DEX/Liquidity Public Purchase Path</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
    <p><strong>DEX path hash:</strong> <code>${escapeHtml(dexPathHash)}</code></p>
  </section>

  <section class="card">
    <h2>Selected path</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${pathRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Candidate pairs</h2>
    <table>
      <thead><tr><th>Pair</th><th>Status</th></tr></thead>
      <tbody>${pairRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Pending decisions</h2>
    <table>
      <thead><tr><th>Decision</th><th>Status</th></tr></thead>
      <tbody>${pendingRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Checks</h2>
    <table>
      <thead><tr><th>Check</th><th>Status</th><th>Details</th></tr></thead>
      <tbody>${checkRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table>
      <thead><tr><th>Area</th><th>Status</th></tr></thead>
      <tbody>${statusRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This page selects the future DEX/liquidity path only. It does not create a pool, add liquidity,
      approve trading, generate a Safe payload, move funds, activate a buy page, or approve full launch.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-liquidity-path">/api/public/dex-liquidity-path</a></p>
    <p><a href="/capability-request-review">Capability Request Review</a></p>
    <p><a href="/capability-activation-intake">Capability Activation Intake</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX/Liquidity Path Selection");
console.log("==========================================");
console.log(`Status: ${report.status}`);
console.log(`Selected path: ${report.selectedPublicPurchasePath.id}`);
console.log(`DEX path hash: ${dexPathHash}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
