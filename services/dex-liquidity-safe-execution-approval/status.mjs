import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const recordRelativePath = "reports/dex-liquidity-safe-execution-approval/dex-liquidity-safe-execution-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const reportDir = path.join(root, "reports", "dex-liquidity-safe-execution-approval");
const statusReportFile = path.join(reportDir, "dex-liquidity-safe-execution-approval-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-liquidity-safe-execution-approval-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-liquidity-safe-execution-approval.html");

fs.mkdirSync(reportDir, { recursive: true });

const artifactPaths = [
  "configs/dex-liquidity-safe-execution-approval.config.json",
  "scripts/record-dex-liquidity-safe-execution-approval.mjs",
  "public-docs/dex-liquidity-safe-pending-signatures-status.json",
  "reports/dex-liquidity-safe-pending-signatures/dex-liquidity-safe-pending-signatures-monitoring.json",
  "public-docs/dex-liquidity-safe-submission-live-status.json",
  "reports/dex-liquidity-safe-submission-live/dex-liquidity-safe-submission-live-record.json",
  "public-docs/dex-liquidity-safe-payload-verification-status.json",
  "reports/dex-liquidity-safe-payload-verification/dex-liquidity-safe-payload-verification.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
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

  return { path: relativePath, bytes: buffer.length, sha256: sha256Buffer(buffer) };
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
  return String(value || "UNKNOWN").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const config = readJson("configs/dex-liquidity-safe-execution-approval.config.json");
const record = readJsonPath(recordPath);
const approvalRecordPresent = Boolean(record && record.schema === "astra-dex-liquidity-safe-execution-approval-record-v0.1");

const pendingStatus = readJson("public-docs/dex-liquidity-safe-pending-signatures-status.json");
const pending = readJson("reports/dex-liquidity-safe-pending-signatures/dex-liquidity-safe-pending-signatures-monitoring.json");
const liveStatus = readJson("public-docs/dex-liquidity-safe-submission-live-status.json");
const payloadVerificationStatus = readJson("public-docs/dex-liquidity-safe-payload-verification-status.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
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

check("Pending signatures threshold reached", pendingStatus.status === "DEX_LIQUIDITY_SAFE_PENDING_SIGNATURES_THRESHOLD_REACHED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING", {
  status: pendingStatus.status || "UNKNOWN"
});

check("Missing confirmations zero", pendingStatus.summary?.thresholdReached === true && Number(pendingStatus.summary?.missingConfirmationCount || 0) === 0, {
  thresholdReached: pendingStatus.summary?.thresholdReached,
  missingConfirmationCount: pendingStatus.summary?.missingConfirmationCount
});

check("Safe transaction not executed", pendingStatus.summary?.safeTransactionExecuted === false && pendingStatus.summary?.liquiditySafeTransactionExecuted === false, {
  safeTransactionExecuted: pendingStatus.summary?.safeTransactionExecuted,
  liquiditySafeTransactionExecuted: pendingStatus.summary?.liquiditySafeTransactionExecuted
});

check("Live submission recorded", liveStatus.status === "DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING", {
  status: liveStatus.status || "UNKNOWN"
});

check("Payload verified", payloadVerificationStatus.status === "DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING", {
  status: payloadVerificationStatus.status || "UNKNOWN"
});

check("Pool remains zero liquidity", poolStatus.status === "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING" && poolStatus.summary?.liquidityVerifiedZero === true && String(poolStatus.summary?.poolLiquidity || "") === "0", {
  status: poolStatus.status || "UNKNOWN",
  liquidityVerifiedZero: poolStatus.summary?.liquidityVerifiedZero,
  poolLiquidity: poolStatus.summary?.poolLiquidity
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
  "reports/dex-liquidity-safe-execution-live/dex-liquidity-safe-execution-live-record.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/dex-liquidity-safe-execution-live-status.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

const forbiddenArtifactsPresent = forbiddenFiles.filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

check("No execution/liquidity/public-trading artifacts present", forbiddenArtifactsPresent.length === 0, {
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
  schema: "astra-dex-liquidity-safe-execution-approval-public-payload-v0.1",
  approvalRecordPresent,
  liquiditySafeExecutionApproved: approvalRecordPresent,
  liquiditySafeAddress: record?.liquiditySafeAddress || pending.liquiditySafeAddress || "",
  safeTxHash: record?.safeTxHash || pending.safeTxHash || "",
  safeNonce: record?.safeNonce ?? pending.safeNonce ?? "",
  safePayloadHash: record?.safePayloadHash || pending.safePayloadHash || "",
  transactionBuilderHash: record?.transactionBuilderHash || pending.transactionBuilderHash || "",
  thresholdReached: record?.thresholdReached === true || pending.thresholdReached === true,
  liquiditySafeTransactionSubmitted: true,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false,
  artifactHashes
};

const approvalHash = sha256Json(approvalPayload);
const failures = checks.filter((item) => !item.pass);

const status = failures.length > 0
  ? "DEX_LIQUIDITY_SAFE_EXECUTION_APPROVAL_REVIEW_REQUIRED"
  : approvalRecordPresent
    ? "DEX_LIQUIDITY_SAFE_EXECUTION_APPROVED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING"
    : "DEX_LIQUIDITY_SAFE_EXECUTION_APPROVAL_READY_PENDING_APPROVAL";

const approvalSummary = approvalRecordPresent
  ? {
      recordedAt: record.recordedAt,
      approver: record.approver,
      approvalReference: record.approvalReference,
      liquiditySafeAddress: record.liquiditySafeAddress,
      safeTxHash: record.safeTxHash,
      safeNonce: record.safeNonce,
      safeTransactionUrl: record.safeTransactionUrl,
      safePayloadHash: record.safePayloadHash,
      transactionBuilderHash: record.transactionBuilderHash,
      calldataHash: record.calldataHash,
      confirmationCount: record.confirmationCount,
      requiredThreshold: record.requiredThreshold,
      missingConfirmationCount: record.missingConfirmationCount,
      thresholdReached: record.thresholdReached,
      liquiditySafeExecutionApproved: true,
      liquiditySafeTransactionSubmitted: true,
      liquiditySafeTransactionExecuted: false,
      liquidityAdded: false,
      positionMinted: false,
      publicTradingApproved: false,
      fullLaunchApproved: false
    }
  : {
      recordedAt: "",
      approver: "not recorded",
      approvalReference: "not recorded",
      liquiditySafeAddress: pending.liquiditySafeAddress || "",
      safeTxHash: pending.safeTxHash || "",
      safeNonce: pending.safeNonce ?? "",
      safeTransactionUrl: pending.safeTransactionUrl || "",
      safePayloadHash: pending.safePayloadHash || "",
      transactionBuilderHash: pending.transactionBuilderHash || "",
      calldataHash: pending.calldataHash || "",
      confirmationCount: pending.confirmationCount ?? "",
      requiredThreshold: pending.requiredThreshold ?? "",
      missingConfirmationCount: pending.missingConfirmationCount ?? "",
      thresholdReached: pending.thresholdReached === true,
      liquiditySafeExecutionApproved: false,
      liquiditySafeTransactionSubmitted: pending.liquiditySafeTransactionSubmitted === true,
      liquiditySafeTransactionExecuted: false,
      liquidityAdded: false,
      positionMinted: false,
      publicTradingApproved: false,
      fullLaunchApproved: false
    };

const report = {
  schema: "astra-dex-liquidity-safe-execution-approval-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: approvalRecordPresent
    ? "AstraTreasury approved later execution of the threshold-reached DEX liquidity Safe transaction. The Safe transaction has not been executed, liquidity has not been added, public trading is not approved, and full launch is not approved."
    : "AstraTreasury DEX liquidity Safe execution approval framework is ready. Execution approval has not yet been recorded.",
  summary: {
    approvalRecordPresent,
    liquiditySafeExecutionApproved: approvalRecordPresent,
    liquiditySafeAddress: approvalSummary.liquiditySafeAddress,
    safeTxHash: approvalSummary.safeTxHash,
    safeNonce: approvalSummary.safeNonce,
    safeTransactionUrl: approvalSummary.safeTransactionUrl,
    safePayloadHash: approvalSummary.safePayloadHash,
    transactionBuilderHash: approvalSummary.transactionBuilderHash,
    calldataHash: approvalSummary.calldataHash,
    confirmationCount: approvalSummary.confirmationCount,
    requiredThreshold: approvalSummary.requiredThreshold,
    missingConfirmationCount: approvalSummary.missingConfirmationCount,
    thresholdReached: approvalSummary.thresholdReached,
    pendingSignatureMonitoringComplete: pending.pendingSignatureMonitoringComplete === true,
    liquiditySafeTransactionSubmitted: true,
    liquiditySafeTransactionExecuted: false,
    liquidityAdded: false,
    positionMinted: false,
    publicTradingApproved: false,
    fullLaunchApproved: false,
    nextRecommendedMilestone: "DEX Liquidity Safe Execution Preparation",
    artifactCount: artifactHashes.length,
    missingArtifactCount: missingArtifacts.length,
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length
  },
  liquiditySafeExecutionApproval: {
    approvalHash,
    hashAlgorithm: "SHA-256",
    approvalSummary,
    requiredBeforeLiquiditySafeExecutionPreparation: config.requiredBeforeLiquiditySafeExecutionPreparation || {},
    hardStops: config.hardStops || {},
    liveChecks: approvalRecordPresent ? record.liveChecks : pending.liveChecks || {},
    confirmationOwners: approvalRecordPresent ? record.confirmationOwners : pending.confirmationOwners || [],
    artifactHashes
  },
  checks,
  failures,
  missingArtifacts,
  currentStatuses: {
    dexLiquiditySafePendingSignatures: pendingStatus.status || "UNKNOWN",
    dexLiquiditySafeSubmissionLive: liveStatus.status || "UNKNOWN",
    dexLiquiditySafePayloadVerification: payloadVerificationStatus.status || "UNKNOWN",
    dexPoolPostExecutionVerification: poolStatus.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
  restrictions: {
    liquiditySafeExecution: !approvalRecordPresent,
    liquidityProvision: false,
    publicTrading: false,
    buyPageActivation: false,
    globalTreasuryFunding: false,
    fullLaunch: false
  },
  safety: {
    approvalOnly: true,
    executesLiquiditySafeTransaction: false,
    addsLiquidity: false,
    mintsPositionOnchain: false,
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

const requiredRows = Object.entries(report.liquiditySafeExecutionApproval.requiredBeforeLiquiditySafeExecutionPreparation).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value === true || value === 0 ? "Complete" : "Required / pending"}</td></tr>`;
}).join("");

const signerRows = (report.liquiditySafeExecutionApproval.confirmationOwners || []).map((owner) => {
  return `<tr><td><code>${escapeHtml(owner)}</code></td></tr>`;
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
  <title>AstraTreasury DEX Liquidity Safe Execution Approval</title>
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
    <div class="badge">Execution approval · not executed · no liquidity</div>
    <h1>DEX Liquidity Safe Execution Approval</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
    <p><strong>Approval hash:</strong> <code>${escapeHtml(approvalHash)}</code></p>
  </section>

  <section class="card">
    <h2>Approval summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${approvalRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Confirmed signers</h2>
    <table><thead><tr><th>Owner</th></tr></thead><tbody>${signerRows || '<tr><td>No confirmations listed.</td></tr>'}</tbody></table>
  </section>

  <section class="card">
    <h2>Required before execution preparation</h2>
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
      This approval does not execute the Safe transaction. Liquidity has not been added,
      public trading is not approved, and full launch is not approved.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-liquidity-safe-execution-approval">/api/public/dex-liquidity-safe-execution-approval</a></p>
    <p><a href="/dex-liquidity-safe-pending-signatures">DEX Liquidity Safe Pending Signatures</a></p>
    <p><a href="/dex-liquidity-safe-submission-live">DEX Liquidity Safe Submission Live</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Liquidity Safe Execution Approval");
console.log("===================================================");
console.log(`Status: ${report.status}`);
console.log(`Approval record present: ${approvalRecordPresent}`);
console.log(`Execution approved: ${report.summary.liquiditySafeExecutionApproved}`);
console.log(`Threshold reached: ${report.summary.thresholdReached}`);
console.log(`Executed: ${report.summary.liquiditySafeTransactionExecuted}`);
console.log(`Liquidity added: ${report.summary.liquidityAdded}`);
console.log(`Report: ${statusReportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
