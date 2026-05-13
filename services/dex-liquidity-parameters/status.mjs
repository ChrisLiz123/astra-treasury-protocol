import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const reportDir = path.join(root, "reports", "dex-liquidity-parameters");
const reportFile = path.join(reportDir, "dex-liquidity-parameter-review-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-liquidity-parameters-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-liquidity-parameters.html");

fs.mkdirSync(reportDir, { recursive: true });

const artifactPaths = [
  "configs/dex-liquidity-parameter-review.config.json",
  "docs/dex-liquidity-parameters/DEX_LIQUIDITY_PARAMETER_REVIEW.md",
  "docs/dex-liquidity-parameters/DEX_LIQUIDITY_PARAMETER_DECISION_MATRIX.md",
  "docs/dex-liquidity-parameters/DEX_LIQUIDITY_RISK_CONTROL_CHECKLIST.md",
  "docs/dex-liquidity-parameters/DEX_LIQUIDITY_SAFE_TREASURY_IMPACT.md",
  "docs/dex-liquidity-parameters/DEX_LIQUIDITY_PUBLIC_DISCLOSURE_DRAFT.md",
  "public-docs/dex-liquidity-path-status.json",
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

const config = readJson("configs/dex-liquidity-parameter-review.config.json");
const dexPath = readJson("public-docs/dex-liquidity-path-status.json");
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

check(checks, "Parameter review prepared", config.parameterReviewPrepared === true, {
  parameterReviewPrepared: config.parameterReviewPrepared
});

check(checks, "Parameters not finalized", config.parametersFinalized === false, {
  parametersFinalized: config.parametersFinalized
});

check(checks, "DEX path selected but not approved", dexPath.status === "DEX_LIQUIDITY_PATH_SELECTED_NOT_APPROVED" && config.dexLiquidityPathApproved === false, {
  dexPathStatus: dexPath.status || "UNKNOWN",
  dexLiquidityPathApproved: config.dexLiquidityPathApproved
});

for (const key of [
  "liquidityPoolCreationApproved",
  "liquidityProvisionApproved",
  "publicTradingApproved",
  "publicTradingLinkApproved",
  "buyPageActivationApproved",
  "safePayloadGenerationApproved",
  "safeTransactionExecutionApproved",
  "treasuryFundingApproved",
  "fullLaunchApproved"
]) {
  check(checks, `${key} remains false`, config[key] === false, { value: config[key] });
}

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

const pendingDecisions = Object.entries(config.parameterDecisions || {})
  .filter(([, value]) => value === false)
  .map(([key]) => key);

const missingArtifacts = artifactPaths.filter((artifactPath) => {
  return !fs.existsSync(path.join(root, artifactPath));
});

for (const artifactPath of missingArtifacts) {
  check(checks, `Parameter review artifact exists: ${artifactPath}`, false, { artifactPath });
}

const artifactHashes = artifactPaths
  .filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)))
  .map((artifactPath) => sha256File(artifactPath));

const payload = {
  schema: "astra-dex-liquidity-parameter-review-payload-v0.1",
  currentApprovedMode: "restricted-mainnet-operation",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  parameterReviewOnly: true,
  parametersFinalized: false,
  artifactHashes
};

const parameterReviewHash = sha256Json(payload);
const failures = checks.filter((item) => !item.pass);

const status = failures.length === 0
  ? "DEX_LIQUIDITY_PARAMETER_REVIEW_READY_NOT_FINALIZED"
  : "DEX_LIQUIDITY_PARAMETER_REVIEW_REQUIRED";

const report = {
  schema: "astra-dex-liquidity-parameter-review-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement:
    "AstraTreasury DEX/liquidity parameter review is ready. Parameters are not finalized, no pool is created, no liquidity is added, no Safe payload is generated, and public trading is not approved.",
  summary: {
    artifactCount: artifactHashes.length,
    missingArtifactCount: missingArtifacts.length,
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    pendingDecisionCount: pendingDecisions.length,
    activeIncidents,
    responseRequired,
    monitorStatus: monitor.status || "UNKNOWN"
  },
  parameterReview: {
    parameterReviewHash,
    hashAlgorithm: "SHA-256",
    candidateVenue: config.candidateVenue,
    candidatePairs: config.candidatePairs || [],
    parameterDecisions: config.parameterDecisions || {},
    parameterPlaceholders: config.parameterPlaceholders || {},
    requiredBeforeFinalization: config.requiredBeforeFinalization || {},
    hardStops: config.hardStops || {},
    artifactHashes
  },
  checks,
  failures,
  missingArtifacts,
  currentStatuses: {
    dexLiquidityPath: dexPath.status || "UNKNOWN",
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
    liquidityPoolCreation: false,
    liquidityProvision: false,
    publicTrading: false,
    buyPageActivation: false,
    realTreasuryFunding: false,
    mainnetExecutionQueue: false,
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
    approvesPublicTrading: false,
    approvesTreasuryFunding: false,
    preparesSafeTransaction: false,
    approvesFullLaunch: false
  }
};

writeJson(reportFile, report);
writeJson(publicJsonFile, report);

const pairRows = report.parameterReview.candidatePairs.map((item) => {
  return `<tr><td>${escapeHtml(item.pair)}</td><td>${escapeHtml(item.network)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.notes)}</td></tr>`;
}).join("");

const decisionRows = Object.entries(report.parameterReview.parameterDecisions).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Finalized" : "Pending"}</td></tr>`;
}).join("");

const requiredRows = Object.entries(report.parameterReview.requiredBeforeFinalization).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete" : "Required / pending"}</td></tr>`;
}).join("");

const hardStopRows = Object.entries(report.parameterReview.hardStops).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "STOP / true" : "False"}</td></tr>`;
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
  <title>AstraTreasury DEX Liquidity Parameters</title>
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
      margin-bottom: 16px;
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
    <div class="badge">Parameter review · not finalized</div>
    <h1>DEX Liquidity Parameters</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
    <p><strong>Parameter review hash:</strong> <code>${escapeHtml(parameterReviewHash)}</code></p>
  </section>

  <section class="card">
    <h2>Candidate pairs</h2>
    <table>
      <thead><tr><th>Pair</th><th>Network</th><th>Status</th><th>Notes</th></tr></thead>
      <tbody>${pairRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Parameter decisions</h2>
    <table>
      <thead><tr><th>Decision</th><th>Status</th></tr></thead>
      <tbody>${decisionRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Required before finalization</h2>
    <table>
      <thead><tr><th>Requirement</th><th>Status</th></tr></thead>
      <tbody>${requiredRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Hard stops</h2>
    <table>
      <thead><tr><th>Item</th><th>Status</th></tr></thead>
      <tbody>${hardStopRows}</tbody>
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
      This parameter review does not finalize the pair, price, liquidity amount, pool type, Safe path,
      public trading link, or buy-page language. It does not create a pool or add liquidity.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-liquidity-parameters">/api/public/dex-liquidity-parameters</a></p>
    <p><a href="/dex-liquidity-path">DEX/Liquidity Path</a></p>
    <p><a href="/capability-request-review">Capability Request Review</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Liquidity Parameter Review");
console.log("============================================");
console.log(`Status: ${report.status}`);
console.log(`Parameters finalized: ${config.parametersFinalized}`);
console.log(`Pending decisions: ${report.summary.pendingDecisionCount}`);
console.log(`Parameter review hash: ${parameterReviewHash}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
