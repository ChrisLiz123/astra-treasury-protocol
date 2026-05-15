import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const recordRelativePath = "reports/dex-liquidity-funding-transfer-safe-submission-preparation/dex-liquidity-funding-transfer-safe-submission-preparation.json";

const reportDir = path.join(root, "reports", "dex-liquidity-funding-transfer-safe-submission-preparation");
const statusReportFile = path.join(reportDir, "dex-liquidity-funding-transfer-safe-submission-preparation-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-liquidity-funding-transfer-safe-submission-preparation-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-liquidity-funding-transfer-safe-submission-preparation.html");

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
const recordPresent = Boolean(record && record.schema === "astra-dex-liquidity-funding-transfer-safe-submission-preparation-v0.1");

const submissionApproval = readJson("public-docs/dex-liquidity-funding-transfer-safe-submission-approval-status.json");
const payloadVerificationStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-payload-verification-status.json");
const payloadStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-payload-status.json");
const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const status = recordPresent
  ? record.status
  : "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_PREPARATION_NOT_RUN";

const artifactPaths = [
  recordRelativePath,
  "public-docs/dex-liquidity-funding-transfer-safe-submission-approval-status.json",
  "public-docs/dex-liquidity-funding-transfer-safe-payload-verification-status.json",
  "public-docs/dex-liquidity-funding-transfer-safe-payload-status.json",
  "reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
].filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths.map((artifactPath) => sha256File(artifactPath));

const txRows = (record?.preparedTransactions || []).map((tx) => {
  return `<tr>
    <td>${escapeHtml(tx.index)}</td>
    <td>${escapeHtml(tx.role)}</td>
    <td>${escapeHtml(tx.symbol)}</td>
    <td><code>${escapeHtml(tx.to)}</code></td>
    <td>${escapeHtml(tx.amountHuman || tx.amountRaw)}</td>
    <td><code>${escapeHtml(tx.dataHash)}</code></td>
  </tr>`;
}).join("");

const publicPayload = {
  schema: "astra-dex-liquidity-funding-transfer-safe-submission-preparation-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: status === "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NO_FUNDS_MOVED"
    ? "AstraTreasury prepared the DEX liquidity funding-transfer Safe submission package. The Safe transaction has not been submitted, no Safe transaction has executed, no treasury funds have moved, no token approvals have executed, no liquidity has been added, public trading is not approved, and full launch is not approved."
    : "AstraTreasury DEX liquidity funding-transfer Safe submission preparation has not completed successfully.",
  summary: {
    recordPresent,
    safeSubmissionPreparationComplete: status === "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NO_FUNDS_MOVED",
    sourceSafeAddress: record?.sourceSafeAddress || "",
    destinationSafeAddress: record?.destinationSafeAddress || "",
    sourceSafeQueueUrl: record?.sourceSafeQueueUrl || "",
    payloadHash: record?.payloadHash || "",
    transactionCount: record?.transactionCount || 0,
    safeSubmissionDryRunComplete: false,
    fundingTransferSubmitted: false,
    fundingTransferExecuted: false,
    treasuryFundsMoved: false,
    tokenApprovalExecuted: false,
    liquidityAdded: false,
    positionMinted: false,
    publicTradingApproved: false,
    fullLaunchApproved: false,
    nextRecommendedMilestone: "DEX Liquidity Treasury Funding Transfer Safe Submission Dry Run",
    artifactCount: artifactHashes.length
  },
  safeSubmissionPreparation: {
    preparationHash: record?.preparationHash || "",
    hashAlgorithm: "SHA-256",
    preparedTransactions: record?.preparedTransactions || [],
    operatorWarnings: record?.operatorWarnings || [],
    requiredBeforeFundingTransferSafeSubmissionDryRun: record?.requiredBeforeFundingTransferSafeSubmissionDryRun || {},
    artifactHashes
  },
  currentStatuses: {
    dexFundingTransferSafeSubmissionApproval: submissionApproval.status || "UNKNOWN",
    dexFundingTransferPayloadVerification: payloadVerificationStatus.status || "UNKNOWN",
    dexFundingTransferSafePayload: payloadStatus.status || "UNKNOWN",
    dexPoolPostExecutionVerification: postExecution.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
  restrictions: {
    fundingTransferSubmission: false,
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
    submitsSafeTransaction: false,
    executesSafeTransaction: false,
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

const warningRows = (publicPayload.safeSubmissionPreparation.operatorWarnings || []).map((warning) => {
  return `<li>${escapeHtml(warning)}</li>`;
}).join("");

const requiredRows = Object.entries(publicPayload.safeSubmissionPreparation.requiredBeforeFundingTransferSafeSubmissionDryRun || {}).map(([key, value]) => {
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
  <title>AstraTreasury DEX Funding Transfer Safe Submission Preparation</title>
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
    <div class="badge">Safe submission prepared · not submitted · no funds moved</div>
    <h1>DEX Funding Transfer Safe Submission Preparation</h1>
    <p>${escapeHtml(publicPayload.publicStatement)}</p>
    <p><strong>Preparation hash:</strong> <code>${escapeHtml(publicPayload.safeSubmissionPreparation.preparationHash)}</code></p>
  </section>

  <section class="card">
    <h2>Summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${summaryRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Prepared transactions</h2>
    <table>
      <thead><tr><th>#</th><th>Role</th><th>Symbol</th><th>To</th><th>Amount</th><th>Data hash</th></tr></thead>
      <tbody>${txRows || '<tr><td colspan="6">No prepared transactions.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Operator warnings</h2>
    <ul>${warningRows}</ul>
  </section>

  <section class="card">
    <h2>Required before submission dry run</h2>
    <table><thead><tr><th>Requirement</th><th>Status</th></tr></thead><tbody>${requiredRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table><thead><tr><th>Area</th><th>Status</th></tr></thead><tbody>${statusRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This is preparation only. It has not submitted or executed the Safe transaction, and no funds have moved.
      The next step is a Safe submission dry run.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-liquidity-funding-transfer-safe-submission-preparation">/api/public/dex-liquidity-funding-transfer-safe-submission-preparation</a></p>
    <p><a href="/dex-liquidity-funding-transfer-safe-submission-approval">DEX Funding Transfer Safe Submission Approval</a></p>
    <p><a href="/dex-liquidity-funding-transfer-safe-payload-verification">DEX Funding Transfer Payload Verification</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Funding Transfer Safe Submission Preparation");
console.log("=============================================================");
console.log(`Status: ${publicPayload.status}`);
console.log(`Preparation complete: ${publicPayload.summary.safeSubmissionPreparationComplete}`);
console.log(`Source Safe: ${publicPayload.summary.sourceSafeAddress}`);
console.log(`Destination Safe: ${publicPayload.summary.destinationSafeAddress}`);
console.log(`Funding transfer submitted: ${publicPayload.summary.fundingTransferSubmitted}`);
console.log(`Funding transfer executed: ${publicPayload.summary.fundingTransferExecuted}`);
console.log(`Treasury funds moved: ${publicPayload.summary.treasuryFundsMoved}`);
console.log(`Report: ${statusReportFile}`);
