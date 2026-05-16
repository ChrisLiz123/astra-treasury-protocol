import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const recordRelativePath = "reports/dex-liquidity-token-approval-safe-submission-dry-run/dex-liquidity-token-approval-safe-submission-dry-run.json";

const reportDir = path.join(root, "reports", "dex-liquidity-token-approval-safe-submission-dry-run");
const statusReportFile = path.join(reportDir, "dex-liquidity-token-approval-safe-submission-dry-run-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-liquidity-token-approval-safe-submission-dry-run-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-liquidity-token-approval-safe-submission-dry-run.html");

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

  return { path: relativePath, bytes: buffer.length, sha256: sha256Buffer(buffer) };
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

const record = readJson(recordRelativePath, null);
const recordPresent = Boolean(record && record.schema === "astra-dex-liquidity-token-approval-safe-submission-dry-run-v0.1");

const preparationStatus = readJson("public-docs/dex-liquidity-token-approval-safe-submission-preparation-status.json");
const submissionApprovalStatus = readJson("public-docs/dex-liquidity-token-approval-safe-submission-approval-status.json");
const verificationStatus = readJson("public-docs/dex-liquidity-token-approval-safe-payload-verification-status.json");
const payloadStatus = readJson("public-docs/dex-liquidity-token-approval-safe-payload-status.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const status = recordPresent
  ? record.status
  : "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_DRY_RUN_NOT_RUN";

const artifactPaths = [
  recordRelativePath,
  "public-docs/dex-liquidity-token-approval-safe-submission-preparation-status.json",
  "reports/dex-liquidity-token-approval-safe-submission-preparation/dex-liquidity-token-approval-safe-submission-preparation.json",
  "public-docs/dex-liquidity-token-approval-safe-submission-approval-status.json",
  "public-docs/dex-liquidity-token-approval-safe-payload-verification-status.json",
  "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json",
  "reports/dex-liquidity-token-approval/payload/token-approval-safe-transaction-builder.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
].filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths.map((artifactPath) => sha256File(artifactPath));

const checkRows = (record?.dryRunTransactionChecks || []).map((check) => {
  return `<tr>
    <td>${escapeHtml(check.role)}</td>
    <td>${escapeHtml(check.symbol)}</td>
    <td><code>${escapeHtml(check.tokenAddress)}</code></td>
    <td>${escapeHtml(check.approvalMode)}</td>
    <td>${escapeHtml(check.builderMatchesPayload)}</td>
    <td>${escapeHtml(check.allowanceStillUnexecuted)}</td>
    <td>${escapeHtml(check.balanceCoversFinalApproval)}</td>
  </tr>`;
}).join("");

const publicPayload = {
  schema: "astra-dex-liquidity-token-approval-safe-submission-dry-run-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: status === "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_DRY_RUN_COMPLETE_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY"
    ? "AstraTreasury completed a dry run of the DEX liquidity token-approval Safe submission package. The Safe transaction has not been submitted, no token approval has executed, no liquidity has been added, public trading is not approved, and full launch is not approved."
    : "AstraTreasury DEX liquidity token-approval Safe submission dry run has not completed successfully.",
  summary: {
    recordPresent,
    tokenApprovalSafeSubmissionDryRunComplete: status === "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_DRY_RUN_COMPLETE_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY",
    operatorSubmissionCommandReviewed: record?.operatorSubmissionCommandReviewed === true,
    liquiditySafeAddress: record?.liquiditySafeAddress || "",
    approvalSpender: record?.approvalSpender || "",
    sourceSafeQueueUrl: record?.sourceSafeQueueUrl || "",
    payloadHash: record?.payloadHash || "",
    transactionBuilderHash: record?.transactionBuilderHash || "",
    transactionCount: record?.transactionCount || 0,
    tokenApprovalSafeTransactionSubmitted: false,
    tokenApprovalSafeTransactionExecuted: false,
    tokenApprovalExecuted: false,
    liquidityMintCalldataGenerated: false,
    liquiditySafePayloadGenerated: false,
    liquidityAdded: false,
    positionMinted: false,
    publicTradingApproved: false,
    fullLaunchApproved: false,
    nextRecommendedMilestone: "DEX Liquidity Token Approval Safe Submission Live",
    artifactCount: artifactHashes.length
  },
  tokenApprovalSafeSubmissionDryRun: {
    dryRunHash: record?.dryRunHash || "",
    hashAlgorithm: "SHA-256",
    dryRunTransactionChecks: record?.dryRunTransactionChecks || [],
    operatorInstruction: record?.operatorInstruction || "",
    requiredBeforeTokenApprovalSafeSubmissionLive: record?.requiredBeforeTokenApprovalSafeSubmissionLive || {},
    artifactHashes
  },
  currentStatuses: {
    dexTokenApprovalSafeSubmissionPreparation: preparationStatus.status || "UNKNOWN",
    dexTokenApprovalSafeSubmissionApproval: submissionApprovalStatus.status || "UNKNOWN",
    dexTokenApprovalSafePayloadVerification: verificationStatus.status || "UNKNOWN",
    dexTokenApprovalSafePayload: payloadStatus.status || "UNKNOWN",
    dexPoolPostExecutionVerification: poolStatus.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
  restrictions: {
    tokenApprovalSubmission: false,
    tokenApprovalExecution: false,
    liquidityProvision: false,
    publicTrading: false,
    buyPageActivation: false,
    globalTreasuryFunding: false,
    fullLaunch: false
  },
  safety: {
    dryRunOnly: true,
    submitsSafeTransaction: false,
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

const requiredRows = Object.entries(publicPayload.tokenApprovalSafeSubmissionDryRun.requiredBeforeTokenApprovalSafeSubmissionLive || {}).map(([key, value]) => {
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
  <title>AstraTreasury DEX Token Approval Safe Submission Dry Run</title>
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
    <div class="badge">Submission dry run complete · not submitted · no approvals executed</div>
    <h1>DEX Token Approval Safe Submission Dry Run</h1>
    <p>${escapeHtml(publicPayload.publicStatement)}</p>
    <p><strong>Dry-run hash:</strong> <code>${escapeHtml(publicPayload.tokenApprovalSafeSubmissionDryRun.dryRunHash)}</code></p>
  </section>

  <section class="card">
    <h2>Summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${summaryRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Dry-run transaction checks</h2>
    <table>
      <thead><tr><th>Role</th><th>Symbol</th><th>Token</th><th>Mode</th><th>Builder matches</th><th>Allowance unexecuted</th><th>Balance covers</th></tr></thead>
      <tbody>${checkRows || '<tr><td colspan="7">No dry-run transaction checks.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Required before live submission</h2>
    <table><thead><tr><th>Requirement</th><th>Status</th></tr></thead><tbody>${requiredRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table><thead><tr><th>Area</th><th>Status</th></tr></thead><tbody>${statusRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This is a dry run only. It has not submitted the Safe transaction, token approvals have not executed,
      liquidity has not been added, public trading is not approved, and full launch is not approved.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-liquidity-token-approval-safe-submission-dry-run">/api/public/dex-liquidity-token-approval-safe-submission-dry-run</a></p>
    <p><a href="/dex-liquidity-token-approval-safe-submission-preparation">DEX Token Approval Safe Submission Preparation</a></p>
    <p><a href="/dex-liquidity-token-approval-safe-submission-approval">DEX Token Approval Safe Submission Approval</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Token Approval Safe Submission Dry Run");
console.log("========================================================");
console.log(`Status: ${publicPayload.status}`);
console.log(`Dry run complete: ${publicPayload.summary.tokenApprovalSafeSubmissionDryRunComplete}`);
console.log(`Liquidity Safe: ${publicPayload.summary.liquiditySafeAddress}`);
console.log(`Token approval submitted: ${publicPayload.summary.tokenApprovalSafeTransactionSubmitted}`);
console.log(`Token approval executed: ${publicPayload.summary.tokenApprovalExecuted}`);
console.log(`Liquidity added: ${publicPayload.summary.liquidityAdded}`);
console.log(`Report: ${statusReportFile}`);
