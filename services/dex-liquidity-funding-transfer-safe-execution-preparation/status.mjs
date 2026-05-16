import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const recordRelativePath = "reports/dex-liquidity-funding-transfer-safe-execution-preparation/dex-liquidity-funding-transfer-safe-execution-preparation.json";

const reportDir = path.join(root, "reports", "dex-liquidity-funding-transfer-safe-execution-preparation");
const statusReportFile = path.join(reportDir, "dex-liquidity-funding-transfer-safe-execution-preparation-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-liquidity-funding-transfer-safe-execution-preparation-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-liquidity-funding-transfer-safe-execution-preparation.html");

fs.mkdirSync(reportDir, { recursive: true });

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

const record = readJson(recordRelativePath, null);
const recordPresent = Boolean(record && record.schema === "astra-dex-liquidity-funding-transfer-safe-execution-preparation-v0.1");

const approvalStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-execution-approval-status.json");
const pendingStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-pending-signatures-status.json");
const liveStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-submission-live-status.json");
const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const status = recordPresent
  ? record.status
  : "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_EXECUTION_PREPARATION_NOT_RUN";

const artifactPaths = [
  recordRelativePath,
  "public-docs/dex-liquidity-funding-transfer-safe-execution-approval-status.json",
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
].filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths.map((artifactPath) => sha256File(artifactPath));

const readinessRows = (record?.executionReadinessChecks || []).map((check) => {
  return `<tr>
    <td>${escapeHtml(check.role)}</td>
    <td>${escapeHtml(check.symbol)}</td>
    <td><code>${escapeHtml(check.tokenAddress)}</code></td>
    <td>${escapeHtml(check.amountHuman || check.amountRaw)}</td>
    <td>${escapeHtml(check.sourceBalanceCoversTransfer)}</td>
    <td>${escapeHtml(check.destinationBalanceUnchanged)}</td>
  </tr>`;
}).join("");

const publicPayload = {
  schema: "astra-dex-liquidity-funding-transfer-safe-execution-preparation-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: status === "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_EXECUTION_PREPARED_NOT_EXECUTED_NO_FUNDS_MOVED"
    ? "AstraTreasury prepared the DEX liquidity funding-transfer Safe execution step. The Safe transaction has not been executed, no treasury funds have moved, no token approvals have executed, no liquidity has been added, public trading is not approved, and full launch is not approved."
    : "AstraTreasury DEX liquidity funding-transfer Safe execution preparation has not completed successfully.",
  summary: {
    recordPresent,
    safeExecutionPreparationComplete: status === "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_EXECUTION_PREPARED_NOT_EXECUTED_NO_FUNDS_MOVED",
    operatorExecutionCommandReviewed: record?.operatorExecutionCommandReviewed === true,
    sourceSafeAddress: record?.sourceSafeAddress || "",
    destinationSafeAddress: record?.destinationSafeAddress || "",
    safeTxHash: record?.safeTxHash || "",
    safeNonce: record?.safeNonce ?? "",
    safeTransactionUrl: record?.safeTransactionUrl || "",
    payloadHash: record?.payloadHash || "",
    serviceThresholdReached: record?.serviceThresholdReached === true,
    serviceExecutionConfirmedFalse: record?.serviceExecutionConfirmedFalse === true,
    safeTransactionExecuted: false,
    fundingTransferExecuted: false,
    treasuryFundsMoved: false,
    tokenApprovalExecuted: false,
    liquidityAdded: false,
    positionMinted: false,
    publicTradingApproved: false,
    fullLaunchApproved: false,
    nextRecommendedMilestone: "DEX Liquidity Treasury Funding Transfer Safe Execution Live",
    artifactCount: artifactHashes.length
  },
  fundingTransferSafeExecutionPreparation: {
    preparationHash: record?.preparationHash || "",
    hashAlgorithm: "SHA-256",
    safeTransactionService: record?.safeTransactionService || {},
    executionReadinessChecks: record?.executionReadinessChecks || [],
    operatorInstruction: record?.operatorInstruction || "",
    requiredBeforeFundingTransferSafeExecutionLive: record?.requiredBeforeFundingTransferSafeExecutionLive || {},
    artifactHashes
  },
  currentStatuses: {
    dexFundingTransferSafeExecutionApproval: approvalStatus.status || "UNKNOWN",
    dexFundingTransferPendingSignatures: pendingStatus.status || "UNKNOWN",
    dexFundingTransferSafeSubmissionLive: liveStatus.status || "UNKNOWN",
    dexPoolPostExecutionVerification: postExecution.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
  restrictions: {
    fundingTransferExecution: false,
    tokenApprovalExecution: false,
    liquidityProvision: false,
    publicTrading: false,
    buyPageActivation: false,
    globalTreasuryFunding: false,
    fullLaunch: false
  },
  safety: {
    preparationOnly: true,
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

writeJson(statusReportFile, publicPayload);
writeJson(publicJsonFile, publicPayload);

const summaryRows = Object.entries(publicPayload.summary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const requiredRows = Object.entries(publicPayload.fundingTransferSafeExecutionPreparation.requiredBeforeFundingTransferSafeExecutionLive || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete" : "Required / pending"}</td></tr>`;
}).join("");

const statusRows = Object.entries(publicPayload.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury DEX Funding Transfer Safe Execution Preparation</title>
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
    <div class="badge">Safe execution prepared · not executed · no funds moved</div>
    <h1>DEX Funding Transfer Safe Execution Preparation</h1>
    <p>${escapeHtml(publicPayload.publicStatement)}</p>
    <p><strong>Preparation hash:</strong> <code>${escapeHtml(publicPayload.fundingTransferSafeExecutionPreparation.preparationHash)}</code></p>
  </section>

  <section class="card">
    <h2>Summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${summaryRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Execution readiness checks</h2>
    <table>
      <thead><tr><th>Role</th><th>Symbol</th><th>Token</th><th>Amount</th><th>Source covers transfer</th><th>Destination unchanged</th></tr></thead>
      <tbody>${readinessRows || '<tr><td colspan="6">No readiness checks.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Required before live execution</h2>
    <table><thead><tr><th>Requirement</th><th>Status</th></tr></thead><tbody>${requiredRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table><thead><tr><th>Area</th><th>Status</th></tr></thead><tbody>${statusRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This is preparation only. It has not executed the Safe transaction, and no funds have moved.
      The next step is live execution and evidence recording.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-liquidity-funding-transfer-safe-execution-preparation">/api/public/dex-liquidity-funding-transfer-safe-execution-preparation</a></p>
    <p><a href="/dex-liquidity-funding-transfer-safe-execution-approval">DEX Funding Transfer Safe Execution Approval</a></p>
    <p><a href="/dex-liquidity-funding-transfer-safe-pending-signatures">DEX Funding Transfer Pending Signatures</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Funding Transfer Safe Execution Preparation");
console.log("=============================================================");
console.log(`Status: ${publicPayload.status}`);
console.log(`Execution preparation complete: ${publicPayload.summary.safeExecutionPreparationComplete}`);
console.log(`Service threshold reached: ${publicPayload.summary.serviceThresholdReached}`);
console.log(`Safe transaction executed: ${publicPayload.summary.safeTransactionExecuted}`);
console.log(`Treasury funds moved: ${publicPayload.summary.treasuryFundsMoved}`);
console.log(`Report: ${statusReportFile}`);
