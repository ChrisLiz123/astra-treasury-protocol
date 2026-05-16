import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const recordRelativePath = "reports/dex-liquidity-funding-transfer-safe-execution-approval/dex-liquidity-funding-transfer-safe-execution-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const reportDir = path.join(root, "reports", "dex-liquidity-funding-transfer-safe-execution-approval");
const statusReportFile = path.join(reportDir, "dex-liquidity-funding-transfer-safe-execution-approval-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-liquidity-funding-transfer-safe-execution-approval-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-liquidity-funding-transfer-safe-execution-approval.html");

fs.mkdirSync(reportDir, { recursive: true });

const artifactPaths = [
  "configs/dex-liquidity-funding-transfer-safe-execution-approval.config.json",
  "scripts/record-dex-liquidity-funding-transfer-safe-execution-approval.mjs",
  "public-docs/dex-liquidity-funding-transfer-safe-pending-signatures-status.json",
  "reports/dex-liquidity-funding-transfer-safe-pending-signatures/dex-liquidity-funding-transfer-safe-pending-signatures-monitoring.json",
  "public-docs/dex-liquidity-funding-transfer-safe-submission-live-status.json",
  "reports/dex-liquidity-funding-transfer-safe-submission-live/dex-liquidity-funding-transfer-safe-submission-live-record.json",
  "reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
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

const config = readJson("configs/dex-liquidity-funding-transfer-safe-execution-approval.config.json");
const record = readJsonPath(recordPath);
const approvalRecordPresent = Boolean(record && record.schema === "astra-dex-liquidity-funding-transfer-safe-execution-approval-record-v0.1");

const pendingStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-pending-signatures-status.json");
const liveStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-submission-live-status.json");
const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const checks = [];

function check(name, pass, details = {}) {
  checks.push({ name, pass: Boolean(pass), details });
}

check("Framework prepared", config.approvalPrepared === true && config.approvalOnly === true, {
  approvalPrepared: config.approvalPrepared,
  approvalOnly: config.approvalOnly
});

check("Pending signatures threshold reached", pendingStatus.status === "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PENDING_SIGNATURES_THRESHOLD_REACHED_NOT_EXECUTED_NO_FUNDS_MOVED" && pendingStatus.summary?.thresholdReached === true, {
  status: pendingStatus.status || "UNKNOWN",
  thresholdReached: pendingStatus.summary?.thresholdReached
});

check("Safe transaction not executed", pendingStatus.summary?.safeTransactionExecuted === false && pendingStatus.summary?.fundingTransferExecuted === false && pendingStatus.summary?.treasuryFundsMoved === false, {
  safeTransactionExecuted: pendingStatus.summary?.safeTransactionExecuted,
  fundingTransferExecuted: pendingStatus.summary?.fundingTransferExecuted,
  treasuryFundsMoved: pendingStatus.summary?.treasuryFundsMoved
});

check("Live submission recorded", liveStatus.status === "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_FUNDS_MOVED", {
  status: liveStatus.status || "UNKNOWN"
});

check("Pool remains verified with zero liquidity", postExecution.status === "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING" && postExecution.summary?.liquidityVerifiedZero === true && String(postExecution.summary?.poolLiquidity || "") === "0", {
  status: postExecution.status || "UNKNOWN",
  liquidityVerifiedZero: postExecution.summary?.liquidityVerifiedZero,
  poolLiquidity: postExecution.summary?.poolLiquidity
});

check("Full launch not approved", fullLaunch.fullLaunchApproved === false, {
  fullLaunchApproved: fullLaunch.fullLaunchApproved
});

check("Global treasury funding not approved/executed", treasuryFunding.treasuryFundingApproved === false && treasuryFunding.treasuryFundingExecuted === false, {
  treasuryFundingApproved: treasuryFunding.treasuryFundingApproved,
  treasuryFundingExecuted: treasuryFunding.treasuryFundingExecuted
});

check("Capability Matrix remains all-disabled", capabilityMatrix.allCapabilitiesDisabled === true && capabilityMatrix.allCapabilityApprovalsFalse === true, {
  allCapabilitiesDisabled: capabilityMatrix.allCapabilitiesDisabled,
  allCapabilityApprovalsFalse: capabilityMatrix.allCapabilityApprovalsFalse
});

check("Execution queue disabled", execution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: execution.mode || "UNKNOWN"
});

const forbiddenFiles = [
  "reports/dex-liquidity-treasury-funding/live/funds-moved.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/payload/token-approval-safe-payload.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

const forbiddenArtifactsPresent = forbiddenFiles.filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

check("No funds/liquidity/public-trading artifacts present", forbiddenArtifactsPresent.length === 0, {
  forbiddenArtifactsPresent
});

const missingArtifacts = artifactPaths.filter((artifactPath) => !fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths
  .filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)))
  .map((artifactPath) => sha256File(artifactPath));

if (fs.existsSync(recordPath)) {
  artifactHashes.push(sha256File(recordRelativePath));
}

const approvalPayload = {
  schema: "astra-dex-liquidity-funding-transfer-safe-execution-approval-public-payload-v0.1",
  approvalRecordPresent,
  fundingTransferSafeExecutionApproved: approvalRecordPresent,
  safeTxHash: record?.safeTxHash || pendingStatus.summary?.safeTxHash || "",
  safeNonce: record?.safeNonce ?? pendingStatus.summary?.safeNonce ?? "",
  thresholdReached: pendingStatus.summary?.thresholdReached === true,
  safeTransactionExecuted: false,
  fundingTransferExecuted: false,
  treasuryFundsMoved: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false,
  artifactHashes
};

const approvalHash = sha256Json(approvalPayload);
const failures = checks.filter((item) => !item.pass);

const status = failures.length > 0
  ? "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_EXECUTION_APPROVAL_REVIEW_REQUIRED"
  : approvalRecordPresent
    ? "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_EXECUTION_APPROVED_NOT_EXECUTED_NO_FUNDS_MOVED"
    : "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_EXECUTION_APPROVAL_READY_PENDING_APPROVAL";

const approvalSummary = approvalRecordPresent
  ? {
      recordedAt: record.recordedAt,
      approver: record.approver,
      approvalReference: record.approvalReference,
      sourceSafeAddress: record.sourceSafeAddress,
      destinationSafeAddress: record.destinationSafeAddress,
      safeTxHash: record.safeTxHash,
      safeNonce: record.safeNonce,
      payloadHash: record.payloadHash,
      thresholdReached: record.thresholdReached,
      fundingTransferSafeExecutionApproved: true,
      safeTransactionExecuted: false,
      fundingTransferExecuted: false,
      treasuryFundsMoved: false,
      tokenApprovalExecuted: false,
      liquidityAdded: false,
      positionMinted: false,
      publicTradingApproved: false,
      fullLaunchApproved: false
    }
  : {
      recordedAt: "",
      approver: "not recorded",
      approvalReference: "not recorded",
      sourceSafeAddress: pendingStatus.summary?.sourceSafeAddress || "",
      destinationSafeAddress: pendingStatus.summary?.destinationSafeAddress || "",
      safeTxHash: pendingStatus.summary?.safeTxHash || "",
      safeNonce: pendingStatus.summary?.safeNonce ?? "",
      payloadHash: pendingStatus.summary?.payloadHash || "",
      thresholdReached: pendingStatus.summary?.thresholdReached === true,
      fundingTransferSafeExecutionApproved: false,
      safeTransactionExecuted: false,
      fundingTransferExecuted: false,
      treasuryFundsMoved: false,
      tokenApprovalExecuted: false,
      liquidityAdded: false,
      positionMinted: false,
      publicTradingApproved: false,
      fullLaunchApproved: false
    };

const report = {
  schema: "astra-dex-liquidity-funding-transfer-safe-execution-approval-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: approvalRecordPresent
    ? "AstraTreasury approved later execution of the threshold-reached DEX liquidity funding-transfer Safe transaction. The Safe transaction has not been executed by this approval step, no treasury funds have moved, no token approvals have executed, no liquidity has been added, public trading is not approved, and full launch is not approved."
    : "AstraTreasury DEX liquidity funding-transfer Safe execution approval framework is ready. Execution approval has not yet been recorded.",
  summary: {
    approvalRecordPresent,
    fundingTransferSafeExecutionApproved: approvalRecordPresent,
    sourceSafeAddress: approvalSummary.sourceSafeAddress,
    destinationSafeAddress: approvalSummary.destinationSafeAddress,
    safeTxHash: approvalSummary.safeTxHash,
    safeNonce: approvalSummary.safeNonce,
    payloadHash: approvalSummary.payloadHash,
    thresholdReached: approvalSummary.thresholdReached,
    safeTransactionExecuted: false,
    fundingTransferExecuted: false,
    treasuryFundsMoved: false,
    tokenApprovalExecuted: false,
    liquidityAdded: false,
    positionMinted: false,
    publicTradingApproved: false,
    fullLaunchApproved: false,
    nextRecommendedMilestone: "DEX Liquidity Treasury Funding Transfer Safe Execution Preparation",
    artifactCount: artifactHashes.length,
    missingArtifactCount: missingArtifacts.length,
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length
  },
  fundingTransferSafeExecutionApproval: {
    approvalHash,
    hashAlgorithm: "SHA-256",
    approvalSummary,
    requiredBeforeFundingTransferSafeExecutionLive: config.requiredBeforeFundingTransferSafeExecutionLive || {},
    hardStops: config.hardStops || {},
    artifactHashes
  },
  checks,
  failures,
  missingArtifacts,
  currentStatuses: {
    dexFundingTransferPendingSignatures: pendingStatus.status || "UNKNOWN",
    dexFundingTransferSafeSubmissionLive: liveStatus.status || "UNKNOWN",
    dexPoolPostExecutionVerification: postExecution.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
  restrictions: {
    fundingTransferExecution: !approvalRecordPresent,
    tokenApprovalExecution: false,
    liquidityProvision: false,
    publicTrading: false,
    buyPageActivation: false,
    globalTreasuryFunding: false,
    fullLaunch: false
  },
  safety: {
    approvalOnly: true,
    executesSafeTransactionByThisScript: false,
    movesTreasuryFunds: false,
    executesTokenApproval: false,
    generatesLiquidityCalldata: false,
    addsLiquidity: false,
    mintsPosition: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

writeJson(statusReportFile, report);
writeJson(publicJsonFile, report);

const approvalRows = Object.entries(approvalSummary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const requiredRows = Object.entries(report.fundingTransferSafeExecutionApproval.requiredBeforeFundingTransferSafeExecutionLive).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete" : "Required / pending"}</td></tr>`;
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
  <title>AstraTreasury DEX Funding Transfer Safe Execution Approval</title>
  <style>
    :root { color-scheme: dark; --bg: #08111f; --surface: #0e1a2b; --border: rgba(148, 163, 184, 0.2); --text: #edf4fb; --muted: #9aaec4; --blue: #67a7ff; --yellow: #f4c35f; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: linear-gradient(180deg, #07101d, var(--bg)); color: var(--text); }
    a { color: var(--blue); text-decoration: none; }
    main { width: min(1120px, calc(100% - 40px)); margin: 0 auto; padding: 44px 0 72px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 28px; box-shadow: 0 22px 70px rgba(0,0,0,.28); margin-bottom: 18px; }
    h1 { margin: 0 0 10px; font-size: 42px; letter-spacing: -1.2px; }
    h2 { margin: 0 0 14px; font-size: 24px; }
    p { color: var(--muted); line-height: 1.65; }
    .badge { display: inline-flex; padding: 8px 12px; border-radius: 999px; background: rgba(244,195,95,.08); border: 1px solid rgba(244,195,95,.22); color: var(--yellow); font-weight: 850; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; border: 1px solid var(--border); border-radius: 18px; overflow: hidden; margin-bottom: 16px; }
    th, td { padding: 14px 16px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }
    th { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; background: rgba(255,255,255,.03); }
    tr:last-child td { border-bottom: 0; }
    code { color: var(--muted); overflow-wrap: anywhere; font-size: 12px; }
    .notice { padding: 16px; border-radius: 16px; background: rgba(244,195,95,.08); border: 1px solid rgba(244,195,95,.22); color: #f7d99a; line-height: 1.6; }
  </style>
</head>
<body>
<main>
  <section class="card">
    <div class="badge">Safe execution approval · not executed · no funds moved</div>
    <h1>DEX Funding Transfer Safe Execution Approval</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
    <p><strong>Approval hash:</strong> <code>${escapeHtml(approvalHash)}</code></p>
  </section>

  <section class="card">
    <h2>Approval summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${approvalRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Required before live execution</h2>
    <table><thead><tr><th>Requirement</th><th>Status</th></tr></thead><tbody>${requiredRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Checks</h2>
    <table><thead><tr><th>Check</th><th>Status</th><th>Details</th></tr></thead><tbody>${checkRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table><thead><tr><th>Area</th><th>Status</th></tr></thead><tbody>${statusRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This approval does not execute the Safe transaction. No funds have moved.
      Execution requires the later execution step.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-liquidity-funding-transfer-safe-execution-approval">/api/public/dex-liquidity-funding-transfer-safe-execution-approval</a></p>
    <p><a href="/dex-liquidity-funding-transfer-safe-pending-signatures">DEX Funding Transfer Pending Signatures</a></p>
    <p><a href="/dex-liquidity-funding-transfer-safe-submission-live">DEX Funding Transfer Safe Submission Live</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Funding Transfer Safe Execution Approval");
console.log("==========================================================");
console.log(`Status: ${report.status}`);
console.log(`Approval record present: ${approvalRecordPresent}`);
console.log(`Execution approved: ${report.summary.fundingTransferSafeExecutionApproved}`);
console.log(`Threshold reached: ${report.summary.thresholdReached}`);
console.log(`Safe transaction executed: ${report.summary.safeTransactionExecuted}`);
console.log(`Treasury funds moved: ${report.summary.treasuryFundsMoved}`);
console.log(`Report: ${statusReportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
