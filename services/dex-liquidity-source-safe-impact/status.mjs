import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const recordRelativePath = "reports/dex-liquidity-source-safe-impact/dex-liquidity-source-safe-impact-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const reportDir = path.join(root, "reports", "dex-liquidity-source-safe-impact");
const reportFile = path.join(reportDir, "dex-liquidity-source-safe-impact-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-liquidity-source-safe-impact-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-liquidity-source-safe-impact.html");

fs.mkdirSync(reportDir, { recursive: true });

const artifactPaths = [
  "configs/dex-liquidity-source-safe-impact-approval.config.json",
  "docs/dex-liquidity-source-safe-impact/DEX_LIQUIDITY_SOURCE_SAFE_IMPACT_APPROVAL.md",
  "docs/dex-liquidity-source-safe-impact/DEX_LIQUIDITY_SOURCE_SAFE_IMPACT_CHECKLIST.md",
  "docs/dex-liquidity-source-safe-impact/DEX_LIQUIDITY_SOURCE_SAFE_IMPACT_BOUNDARIES.md",
  "docs/dex-liquidity-source-safe-impact/DEX_LIQUIDITY_SOURCE_SAFE_IMPACT_RUNBOOK.md",
  "scripts/record-dex-liquidity-source-safe-impact-approval.mjs",
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

function readJson(relativePath, fallback = {}) {
  try {
    const full = path.join(root, relativePath);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function readJsonPath(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

const config = readJson("configs/dex-liquidity-source-safe-impact-approval.config.json");
const record = readJsonPath(recordPath);
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

const approvalRecordPresent = Boolean(record && record.schema === "astra-dex-liquidity-source-safe-impact-approval-record-v0.1");
const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);

const checks = [];

check(checks, "Source/Safe impact framework prepared", config.sourceSafeImpactApprovalPrepared === true, {
  sourceSafeImpactApprovalPrepared: config.sourceSafeImpactApprovalPrepared
});

check(checks, "Source/Safe impact approval only", config.sourceSafeImpactApprovalOnly === true, {
  sourceSafeImpactApprovalOnly: config.sourceSafeImpactApprovalOnly
});

check(checks, "DEX parameter approval recorded", parameterApproval.status === "DEX_LIQUIDITY_PARAMETERS_APPROVED_NO_POOL_NO_LIQUIDITY", {
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

check(checks, "Full launch not approved", fullLaunch.fullLaunchApproved === false, {
  fullLaunchApproved: fullLaunch.fullLaunchApproved
});

check(checks, "Treasury funding not approved", treasuryFunding.treasuryFundingApproved === false, {
  treasuryFundingApproved: treasuryFunding.treasuryFundingApproved
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

if (approvalRecordPresent) {
  for (const key of [
    "poolCreated",
    "liquidityAdded",
    "publicTradingApproved",
    "publicTradingLinkApproved",
    "buyPageActivated",
    "safePayloadGenerated",
    "safeTransactionExecuted",
    "treasuryFundsMoved",
    "treasuryFundingApproved",
    "fullLaunchApproved"
  ]) {
    check(checks, `record.${key} remains false`, record[key] === false, { value: record[key] });
  }
}

const missingArtifacts = artifactPaths.filter((artifactPath) => {
  return !fs.existsSync(path.join(root, artifactPath));
});

for (const artifactPath of missingArtifacts) {
  check(checks, `Source/Safe impact artifact exists: ${artifactPath}`, false, { artifactPath });
}

const artifactHashes = artifactPaths
  .filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)))
  .map((artifactPath) => sha256File(artifactPath));

if (fs.existsSync(recordPath)) {
  artifactHashes.push(sha256File(recordRelativePath));
}

const payload = {
  schema: "astra-dex-liquidity-source-safe-impact-approval-payload-v0.1",
  currentApprovedMode: "restricted-mainnet-operation",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  approvalRecordPresent,
  planningOnly: true,
  poolCreated: false,
  liquidityAdded: false,
  safePayloadGenerated: false,
  treasuryFundsMoved: false,
  publicTradingApproved: false,
  artifactHashes
};

const sourceSafeImpactHash = sha256Json(payload);
const failures = checks.filter((item) => !item.pass);

const status = failures.length > 0
  ? "DEX_LIQUIDITY_SOURCE_SAFE_IMPACT_REVIEW_REQUIRED"
  : approvalRecordPresent
    ? "DEX_LIQUIDITY_SOURCE_SAFE_IMPACT_APPROVED_NO_FUNDS_NO_SAFE_PAYLOAD"
    : "DEX_LIQUIDITY_SOURCE_SAFE_IMPACT_READY_PENDING_APPROVAL";

const approvalSummary = approvalRecordPresent
  ? {
      recordedAt: record.recordedAt,
      approver: record.approver,
      approvalReference: record.approvalReference,
      liquiditySourceClassification: record.liquiditySourceClassification,
      safeImpactClassification: record.safeImpactClassification,
      treasuryOrSafeImpact: record.treasuryOrSafeImpact,
      selectedPair: record.selectionSummary?.selectedPair || record.selectionSummary?.tokenPair || "",
      poolVersion: record.selectionSummary?.poolVersion || "",
      liquiditySource: record.selectionSummary?.liquiditySource || "",
      poolCreated: false,
      liquidityAdded: false,
      safePayloadGenerated: false,
      treasuryFundsMoved: false,
      publicTradingApproved: false,
      fullLaunchApproved: false
    }
  : {
      recordedAt: "",
      approver: "not recorded",
      approvalReference: "not recorded",
      liquiditySourceClassification: "not recorded",
      safeImpactClassification: "not recorded",
      treasuryOrSafeImpact: false,
      selectedPair: parameterApproval.parameterApproval?.approvalSummary?.selectedPair || "",
      poolVersion: parameterApproval.parameterApproval?.approvalSummary?.poolVersion || "",
      liquiditySource: parameterApproval.parameterApproval?.approvalSummary?.liquiditySource || "",
      poolCreated: false,
      liquidityAdded: false,
      safePayloadGenerated: false,
      treasuryFundsMoved: false,
      publicTradingApproved: false,
      fullLaunchApproved: false
    };

const report = {
  schema: "astra-dex-liquidity-source-safe-impact-approval-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement:
    approvalRecordPresent
      ? "AstraTreasury DEX liquidity source and Safe-impact plan are approved for later action-specific execution review only. No pool is created, no liquidity is added, no Safe payload is generated, no funds are moved, and public trading is not approved."
      : "AstraTreasury DEX liquidity source and Safe-impact approval framework is ready. Source/Safe-impact approval has not yet been recorded.",
  summary: {
    approvalRecordPresent,
    artifactCount: artifactHashes.length,
    missingArtifactCount: missingArtifacts.length,
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    activeIncidents,
    responseRequired,
    monitorStatus: monitor.status || "UNKNOWN"
  },
  sourceSafeImpactApproval: {
    sourceSafeImpactHash,
    hashAlgorithm: "SHA-256",
    approvalSummary,
    artifactHashes
  },
  checks,
  failures,
  missingArtifacts,
  currentStatuses: {
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

const approvalRows = Object.entries(approvalSummary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
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
  <title>AstraTreasury DEX Liquidity Source and Safe Impact</title>
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
    <div class="badge">Source/Safe impact · no funds/no payload</div>
    <h1>DEX Liquidity Source and Safe Impact</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
    <p><strong>Source/Safe impact hash:</strong> <code>${escapeHtml(sourceSafeImpactHash)}</code></p>
  </section>

  <section class="card">
    <h2>Approval summary</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${approvalRows}</tbody>
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
      Source/Safe-impact approval does not create a pool, add liquidity, generate a Safe payload,
      move funds, activate a buy page, or approve public trading.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-liquidity-source-safe-impact">/api/public/dex-liquidity-source-safe-impact</a></p>
    <p><a href="/dex-liquidity-parameter-approval">DEX Parameter Approval</a></p>
    <p><a href="/dex-liquidity-parameter-finalization">DEX Parameter Finalization Review</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Liquidity Source and Safe Impact");
console.log("==================================================");
console.log(`Status: ${report.status}`);
console.log(`Approval record present: ${approvalRecordPresent}`);
console.log(`Source/Safe impact hash: ${sourceSafeImpactHash}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
