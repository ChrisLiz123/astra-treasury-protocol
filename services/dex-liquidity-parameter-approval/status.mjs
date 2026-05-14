import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const recordRelativePath = "reports/dex-liquidity-parameter-approval/dex-liquidity-parameter-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const reportDir = path.join(root, "reports", "dex-liquidity-parameter-approval");
const reportFile = path.join(reportDir, "dex-liquidity-parameter-approval-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-liquidity-parameter-approval-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-liquidity-parameter-approval.html");

fs.mkdirSync(reportDir, { recursive: true });

const artifactPaths = [
  "configs/dex-liquidity-parameter-approval.config.json",
  "docs/dex-liquidity-parameter-approval/DEX_LIQUIDITY_PARAMETER_APPROVAL_PACKAGE.md",
  "docs/dex-liquidity-parameter-approval/DEX_PARAMETER_APPROVAL_CHECKLIST.md",
  "docs/dex-liquidity-parameter-approval/DEX_PARAMETER_APPROVAL_BOUNDARIES.md",
  "docs/dex-liquidity-parameter-approval/DEX_PARAMETER_APPROVAL_RUNBOOK.md",
  "scripts/record-dex-liquidity-parameter-approval.mjs",
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

const config = readJson("configs/dex-liquidity-parameter-approval.config.json");
const record = readJsonPath(recordPath);
const selection = readJson("public-docs/dex-liquidity-parameter-selection-status.json");
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

const approvalRecordPresent = Boolean(record && record.schema === "astra-dex-liquidity-parameter-approval-record-v0.1");
const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);

const checks = [];

check(checks, "Parameter approval framework prepared", config.parameterApprovalPrepared === true, {
  parameterApprovalPrepared: config.parameterApprovalPrepared
});

check(checks, "Parameter approval only", config.parameterApprovalOnly === true, {
  parameterApprovalOnly: config.parameterApprovalOnly
});

check(checks, "Valid imported selection exists", selection.status === "DEX_LIQUIDITY_PARAMETER_SELECTION_IMPORTED_NOT_APPROVED" && selection.summary?.selectionValid === true, {
  status: selection.status || "UNKNOWN",
  selectionValid: selection.summary?.selectionValid
});

check(checks, "Finalization review ready", [
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
  check(checks, `Parameter approval artifact exists: ${artifactPath}`, false, { artifactPath });
}

const artifactHashes = artifactPaths
  .filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)))
  .map((artifactPath) => sha256File(artifactPath));

if (fs.existsSync(recordPath)) {
  artifactHashes.push(sha256File(recordRelativePath));
}

const payload = {
  schema: "astra-dex-liquidity-parameter-approval-payload-v0.1",
  currentApprovedMode: "restricted-mainnet-operation",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  approvalRecordPresent,
  approvesParametersOnly: approvalRecordPresent,
  poolCreated: false,
  liquidityAdded: false,
  publicTradingApproved: false,
  artifactHashes
};

const parameterApprovalHash = sha256Json(payload);
const failures = checks.filter((item) => !item.pass);

const status = failures.length > 0
  ? "DEX_LIQUIDITY_PARAMETER_APPROVAL_REVIEW_REQUIRED"
  : approvalRecordPresent
    ? "DEX_LIQUIDITY_PARAMETERS_APPROVED_NO_POOL_NO_LIQUIDITY"
    : "DEX_LIQUIDITY_PARAMETER_APPROVAL_READY_PENDING_APPROVAL";

const approvalSummary = approvalRecordPresent
  ? {
      recordedAt: record.recordedAt,
      approver: record.approver,
      approvalReference: record.approvalReference,
      selectedPair: record.selectionSummary?.tokenPair || "",
      poolVersion: record.selectionSummary?.poolVersion || "",
      feeTierOrPoolType: record.selectionSummary?.feeTierOrPoolType || "",
      initialPriceHuman: record.selectionSummary?.initialPriceHuman || "",
      liquidityAmountAstra: record.selectionSummary?.liquidityAmountAstra || "",
      liquidityAmountCounterAsset: record.selectionSummary?.liquidityAmountCounterAsset || "",
      liquiditySource: record.selectionSummary?.liquiditySource || "",
      poolCreated: false,
      liquidityAdded: false,
      publicTradingApproved: false,
      safePayloadGenerated: false,
      fullLaunchApproved: false
    }
  : {
      recordedAt: "",
      approver: "not recorded",
      approvalReference: "not recorded",
      selectedPair: selection.selectionImport?.selectionSummary?.tokenPair || "",
      poolVersion: selection.selectionImport?.selectionSummary?.poolVersion || "",
      feeTierOrPoolType: selection.selectionImport?.selectionSummary?.feeTierOrPoolType || "",
      initialPriceHuman: selection.selectionImport?.selectionSummary?.initialPriceHuman || "",
      liquidityAmountAstra: selection.selectionImport?.selectionSummary?.liquidityAmountAstra || "",
      liquidityAmountCounterAsset: selection.selectionImport?.selectionSummary?.liquidityAmountCounterAsset || "",
      liquiditySource: selection.selectionImport?.selectionSummary?.liquiditySource || "",
      poolCreated: false,
      liquidityAdded: false,
      publicTradingApproved: false,
      safePayloadGenerated: false,
      fullLaunchApproved: false
    };

const report = {
  schema: "astra-dex-liquidity-parameter-approval-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement:
    approvalRecordPresent
      ? "AstraTreasury DEX/liquidity parameters are approved for later action-specific execution review only. No pool is created, no liquidity is added, no Safe payload is generated, and public trading is not approved."
      : "AstraTreasury DEX/liquidity parameter approval framework is ready. Parameters are selected but not yet approved.",
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
  parameterApproval: {
    parameterApprovalHash,
    hashAlgorithm: "SHA-256",
    approvalSummary,
    artifactHashes
  },
  checks,
  failures,
  missingArtifacts,
  currentStatuses: {
    dexLiquidityParameterSelection: selection.status || "UNKNOWN",
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
  <title>AstraTreasury DEX Parameter Approval</title>
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
    <div class="badge">Parameter approval · no pool/no liquidity</div>
    <h1>DEX Parameter Approval</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
    <p><strong>Parameter approval hash:</strong> <code>${escapeHtml(parameterApprovalHash)}</code></p>
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
      Parameter approval does not create a pool, add liquidity, generate a Safe payload,
      move funds, activate a buy page, or approve public trading.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-liquidity-parameter-approval">/api/public/dex-liquidity-parameter-approval</a></p>
    <p><a href="/dex-liquidity-parameter-finalization">DEX Parameter Finalization Review</a></p>
    <p><a href="/dex-liquidity-parameter-selection">DEX Parameter Selection</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Liquidity Parameter Approval");
console.log("==============================================");
console.log(`Status: ${report.status}`);
console.log(`Approval record present: ${approvalRecordPresent}`);
console.log(`Parameter approval hash: ${parameterApprovalHash}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
