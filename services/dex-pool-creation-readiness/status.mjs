import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const reportDir = path.join(root, "reports", "dex-pool-creation-readiness");
const reportFile = path.join(reportDir, "dex-pool-creation-readiness-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-pool-creation-readiness-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-pool-creation-readiness.html");

fs.mkdirSync(reportDir, { recursive: true });

const artifactPaths = [
  "configs/dex-pool-creation-readiness.config.json",
  "docs/dex-pool-creation-readiness/DEX_POOL_CREATION_READINESS.md",
  "docs/dex-pool-creation-readiness/DEX_POOL_CREATION_READINESS_CHECKLIST.md",
  "docs/dex-pool-creation-readiness/DEX_POOL_CREATION_BOUNDARIES.md",
  "docs/dex-pool-creation-readiness/DEX_POOL_CREATION_READINESS_RUNBOOK.md",
  "public-docs/dex-liquidity-source-safe-impact-status.json",
  "public-docs/dex-liquidity-parameter-approval-status.json",
  "public-docs/dex-liquidity-parameter-selection-status.json",
  "public-docs/dex-liquidity-parameter-finalization-status.json",
  "public-docs/dex-liquidity-parameters-status.json",
  "public-docs/dex-liquidity-path-status.json",
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

const forbiddenArtifactPaths = [
  "reports/dex-pool-creation/live/dex-pool-created.json",
  "reports/dex-pool-creation/live/pool-created.json",
  "reports/dex-pool-creation/payload/safe-payload.json",
  "reports/dex-pool-creation/payload/transaction.json"
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

const config = readJson("configs/dex-pool-creation-readiness.config.json");
const sourceSafeImpact = readJson("public-docs/dex-liquidity-source-safe-impact-status.json");
const parameterApproval = readJson("public-docs/dex-liquidity-parameter-approval-status.json");
const parameterSelection = readJson("public-docs/dex-liquidity-parameter-selection-status.json");
const finalizationReview = readJson("public-docs/dex-liquidity-parameter-finalization-status.json");
const parameterReview = readJson("public-docs/dex-liquidity-parameters-status.json");
const dexPath = readJson("public-docs/dex-liquidity-path-status.json");
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
const forbiddenArtifactsPresent = forbiddenArtifactPaths.filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

const checks = [];

check(checks, "Pool creation readiness prepared", config.poolCreationReadinessPrepared === true, {
  poolCreationReadinessPrepared: config.poolCreationReadinessPrepared
});

check(checks, "Pool creation readiness only", config.poolCreationReadinessOnly === true, {
  poolCreationReadinessOnly: config.poolCreationReadinessOnly
});

check(checks, "Source/Safe impact approved for planning", sourceSafeImpact.status === "DEX_LIQUIDITY_SOURCE_SAFE_IMPACT_APPROVED_NO_FUNDS_NO_SAFE_PAYLOAD", {
  status: sourceSafeImpact.status || "UNKNOWN"
});

check(checks, "DEX parameters approved", parameterApproval.status === "DEX_LIQUIDITY_PARAMETERS_APPROVED_NO_POOL_NO_LIQUIDITY", {
  status: parameterApproval.status || "UNKNOWN"
});

check(checks, "Valid imported parameter selection exists", parameterSelection.status === "DEX_LIQUIDITY_PARAMETER_SELECTION_IMPORTED_NOT_APPROVED" && parameterSelection.summary?.selectionValid === true, {
  status: parameterSelection.status || "UNKNOWN",
  selectionValid: parameterSelection.summary?.selectionValid
});

check(checks, "Finalization review status acceptable", [
  "DEX_LIQUIDITY_PARAMETER_FINALIZATION_REVIEW_READY_NOT_APPROVED",
  "DEX_LIQUIDITY_PARAMETER_FINALIZATION_REVIEW_PARAMETERS_APPROVED_NO_POOL"
].includes(finalizationReview.status), {
  status: finalizationReview.status || "UNKNOWN"
});

check(checks, "Parameter review ready", parameterReview.status === "DEX_LIQUIDITY_PARAMETER_REVIEW_READY_NOT_FINALIZED", {
  status: parameterReview.status || "UNKNOWN"
});

check(checks, "DEX path selected not approved", dexPath.status === "DEX_LIQUIDITY_PATH_SELECTED_NOT_APPROVED", {
  status: dexPath.status || "UNKNOWN"
});

check(checks, "Restricted-mode final release ready", finalRelease.status === "RESTRICTED_MODE_FINAL_RELEASE_READY_DECISION_RECORDED_ALL_DISABLED", {
  status: finalRelease.status || "UNKNOWN"
});

check(checks, "Governance decision recorded", governanceDecision.governanceDecisionRecorded === true && governanceDecision.fullLaunchApproved === false, {
  governanceDecisionRecorded: governanceDecision.governanceDecisionRecorded,
  fullLaunchApproved: governanceDecision.fullLaunchApproved
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

check(checks, "Safe payload not generated", treasurySafeTx.safeTransactionPayloadGenerated === false && config.safePayloadGenerated === false, {
  safeTransactionPayloadGenerated: treasurySafeTx.safeTransactionPayloadGenerated,
  configSafePayloadGenerated: config.safePayloadGenerated
});

check(checks, "Safe transaction not prepared", treasurySafeTx.safeTransactionPrepared === false, {
  safeTransactionPrepared: treasurySafeTx.safeTransactionPrepared
});

check(checks, "No forbidden pool/payload artifacts present", forbiddenArtifactsPresent.length === 0, {
  forbiddenArtifactsPresent
});

for (const key of [
  "poolCreationApproved",
  "poolCreated",
  "liquidityProvisionApproved",
  "liquidityAdded",
  "publicTradingApproved",
  "publicTradingLinkApproved",
  "buyPageActivationApproved",
  "safePayloadGenerationApproved",
  "safePayloadGenerated",
  "safeTransactionExecutionApproved",
  "safeTransactionExecuted",
  "treasuryFundsMoved"
]) {
  check(checks, `${key} remains false`, config[key] === false, { value: config[key] });
}

const missingArtifacts = artifactPaths.filter((artifactPath) => {
  return !fs.existsSync(path.join(root, artifactPath));
});

for (const artifactPath of missingArtifacts) {
  check(checks, `Pool readiness artifact exists: ${artifactPath}`, false, { artifactPath });
}

const artifactHashes = artifactPaths
  .filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)))
  .map((artifactPath) => sha256File(artifactPath));

const payload = {
  schema: "astra-dex-pool-creation-readiness-payload-v0.1",
  currentApprovedMode: "restricted-mainnet-operation",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  readinessOnly: true,
  readyForPoolCreationApprovalPackage: true,
  poolCreated: false,
  liquidityAdded: false,
  safePayloadGenerated: false,
  publicTradingApproved: false,
  artifactHashes
};

const poolCreationReadinessHash = sha256Json(payload);
const failures = checks.filter((item) => !item.pass);

const status = failures.length === 0
  ? "DEX_POOL_CREATION_READINESS_READY_NO_POOL_CREATED"
  : "DEX_POOL_CREATION_READINESS_REVIEW_REQUIRED";

const selectedParameters = parameterApproval.parameterApproval?.approvalSummary || {};
const sourceSafePlan = sourceSafeImpact.sourceSafeImpactApproval?.approvalSummary || {};

const report = {
  schema: "astra-dex-pool-creation-readiness-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement:
    "AstraTreasury DEX pool creation readiness gate is ready for a later pool-creation approval package. No pool is created, no liquidity is added, no Safe payload is generated, no funds are moved, and public trading is not approved.",
  summary: {
    readyForPoolCreationApprovalPackage: failures.length === 0,
    artifactCount: artifactHashes.length,
    missingArtifactCount: missingArtifacts.length,
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    activeIncidents,
    responseRequired,
    monitorStatus: monitor.status || "UNKNOWN"
  },
  poolCreationReadiness: {
    poolCreationReadinessHash,
    hashAlgorithm: "SHA-256",
    selectedParameters,
    sourceSafePlan,
    requiredBeforePoolCreationApproval: config.requiredBeforePoolCreationApproval || {},
    hardStops: config.hardStops || {},
    artifactHashes
  },
  checks,
  failures,
  missingArtifacts,
  currentStatuses: {
    dexLiquiditySourceSafeImpact: sourceSafeImpact.status || "UNKNOWN",
    dexLiquidityParameterApproval: parameterApproval.status || "UNKNOWN",
    dexLiquidityParameterSelection: parameterSelection.status || "UNKNOWN",
    dexLiquidityParameterFinalization: finalizationReview.status || "UNKNOWN",
    dexLiquidityParameters: parameterReview.status || "UNKNOWN",
    dexLiquidityPath: dexPath.status || "UNKNOWN",
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
    dexLiquidityPoolTrading: false,
    poolCreation: false,
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
    createsLiquidityPool: false,
    addsLiquidity: false,
    enablesPublicTrading: false,
    generatesSafePayload: false,
    activatesBuyPage: false,
    approvesFullLaunch: false
  }
};

writeJson(reportFile, report);
writeJson(publicJsonFile, report);

const parameterRows = Object.entries(selectedParameters).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const sourceRows = Object.entries(sourceSafePlan).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const requiredRows = Object.entries(report.poolCreationReadiness.requiredBeforePoolCreationApproval).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete" : "Required / pending"}</td></tr>`;
}).join("");

const hardStopRows = Object.entries(report.poolCreationReadiness.hardStops).map(([key, value]) => {
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
  <title>AstraTreasury DEX Pool Creation Readiness</title>
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
    <div class="badge">Pool creation readiness · no pool created</div>
    <h1>DEX Pool Creation Readiness</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
    <p><strong>Readiness hash:</strong> <code>${escapeHtml(poolCreationReadinessHash)}</code></p>
  </section>

  <section class="card">
    <h2>Selected parameters</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${parameterRows || '<tr><td colspan="2">No parameter summary available.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Source/Safe plan</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${sourceRows || '<tr><td colspan="2">No source/Safe summary available.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Required before pool creation approval</h2>
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
      Readiness does not approve or execute pool creation. No pool is created, no liquidity is added,
      no Safe payload is generated, no funds are moved, and public trading is not approved.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-pool-creation-readiness">/api/public/dex-pool-creation-readiness</a></p>
    <p><a href="/dex-liquidity-source-safe-impact">DEX Source/Safe Impact</a></p>
    <p><a href="/dex-liquidity-parameter-approval">DEX Parameter Approval</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Pool Creation Readiness");
console.log("=========================================");
console.log(`Status: ${report.status}`);
console.log(`Ready for later pool-creation approval package: ${report.summary.readyForPoolCreationApprovalPackage}`);
console.log(`Readiness hash: ${poolCreationReadinessHash}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
