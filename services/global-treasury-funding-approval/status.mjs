import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const recordRelativePath = "reports/global-treasury-funding-approval/global-treasury-funding-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const reportDir = path.join(root, "reports", "global-treasury-funding-approval");
const statusReportFile = path.join(reportDir, "global-treasury-funding-approval-status.json");

const publicJsonFile = path.join(root, "public-docs", "global-treasury-funding-approval-status.json");
const publicHtmlFile = path.join(root, "public-docs", "global-treasury-funding-approval.html");
const publicApprovedJsonFile = path.join(root, "public-docs", "global-treasury-funding-approved-status.json");

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

const config = readJson("configs/global-treasury-funding-approval.config.json");
const record = readJsonPath(recordPath);
const approvalRecordPresent = Boolean(record && record.schema === "astra-global-treasury-funding-approval-record-v0.1");

const reviewStatus = readJson("public-docs/global-treasury-funding-approval-review-status.json");
const review = readJson("reports/global-treasury-funding-approval-review/global-treasury-funding-approval-review.json");
const fullLaunchLiveStatus = readJson("public-docs/full-launch-live-status.json");
const fullLaunchStatus = readJson("public-docs/full-launch-status.json");
const postStatus = readJson("public-docs/dex-liquidity-post-execution-verification-status.json");
const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");

const artifactPaths = [
  "configs/global-treasury-funding-approval.config.json",
  "scripts/record-global-treasury-funding-approval.mjs",
  "public-docs/global-treasury-funding-approval-review-status.json",
  "reports/global-treasury-funding-approval-review/global-treasury-funding-approval-review.json",
  "public-docs/full-launch-live-status.json",
  "reports/full-launch-live/full-launch-live-record.json",
  "public-docs/full-launch-status.json",
  "public-docs/dex-liquidity-post-execution-verification-status.json",
  "reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json",
  "public-docs/treasury-funding-status.json"
];

const artifactHashes = artifactPaths
  .filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)))
  .map((artifactPath) => sha256File(artifactPath));

if (fs.existsSync(recordPath)) {
  artifactHashes.push(sha256File(recordRelativePath));
}

const checks = [];

function check(name, pass, details = {}) {
  checks.push({ name, pass: Boolean(pass), details });
}

check("Framework prepared", config.approvalPrepared === true && config.approvalOnly === true, {
  approvalPrepared: config.approvalPrepared,
  approvalOnly: config.approvalOnly
});

check("Approval review complete", reviewStatus.status === "GLOBAL_TREASURY_FUNDING_APPROVAL_REVIEW_COMPLETE_FULL_LAUNCH_LIVE_TREASURY_FUNDING_NOT_APPROVED", {
  status: reviewStatus.status || "UNKNOWN"
});

check("Ready for funding approval", review.readyForGlobalTreasuryFundingApproval === true, {
  readyForGlobalTreasuryFundingApproval: review.readyForGlobalTreasuryFundingApproval
});

check("Full launch live", fullLaunchLiveStatus.status === "FULL_LAUNCH_LIVE_PUBLIC_FINALIZATION_RECORDED_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED", {
  status: fullLaunchLiveStatus.status || "UNKNOWN"
});

check("Liquidity verified", postStatus.status === "DEX_LIQUIDITY_POST_EXECUTION_VERIFIED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING", {
  status: postStatus.status || "UNKNOWN"
});

check("No funding payload/execution artifacts", !fs.existsSync(path.join(root, "reports/global-treasury-funding/payload/global-treasury-funding-safe-payload.json")) && !fs.existsSync(path.join(root, "reports/global-treasury-funding/live/global-treasury-funding-executed.json")) && !fs.existsSync(path.join(root, "reports/treasury-funding/live/funds-moved.json")), {});

const failures = checks.filter((item) => !item.pass);

const status = failures.length > 0
  ? "GLOBAL_TREASURY_FUNDING_APPROVAL_REVIEW_REQUIRED"
  : approvalRecordPresent
    ? "GLOBAL_TREASURY_FUNDING_APPROVED_FULL_LAUNCH_LIVE_NO_PAYLOAD_NO_FUNDS_MOVED"
    : "GLOBAL_TREASURY_FUNDING_APPROVAL_READY_PENDING_APPROVAL";

const approvalPayload = {
  schema: "astra-global-treasury-funding-approval-public-payload-v0.1",
  approvalRecordPresent,
  globalTreasuryFundingApprovalRecorded: approvalRecordPresent,
  globalTreasuryFundingApproved: approvalRecordPresent,
  treasuryFundingApproved: approvalRecordPresent,
  treasuryFundingExecuted: false,
  fundingPayloadGenerated: false,
  fundsMoved: false,
  fullLaunchLive: true,
  launchPageUrl: record?.launchPageUrl || review.launchPageUrl || "",
  buyPageUrl: record?.buyPageUrl || review.buyPageUrl || "",
  liquiditySafeAddress: record?.liquiditySafeAddress || postVerification.liquiditySafeAddress || "",
  executionTxHash: record?.executionTxHash || postVerification.executionTxHash || "",
  poolAddress: record?.poolAddress || postVerification.poolAddress || "",
  poolLiquidityLive: record?.poolLiquidityLive || postVerification.poolLiquidityLive || "",
  positionTokenId: record?.positionTokenId || postVerification.positionTokenId || "",
  artifactHashes
};

const approvalHash = sha256Json(approvalPayload);

const approvalSummary = approvalRecordPresent
  ? {
      recordedAt: record.recordedAt,
      approver: record.approver,
      approvalReference: record.approvalReference,
      fullLaunchLive: true,
      launchPageUrl: record.launchPageUrl,
      buyPageUrl: record.buyPageUrl,
      tradingLinkUrl: record.tradingLinkUrl,
      liquiditySafeAddress: record.liquiditySafeAddress,
      executionTxHash: record.executionTxHash,
      poolAddress: record.poolAddress,
      poolLiquidityLive: record.poolLiquidityLive,
      positionTokenId: record.positionTokenId,
      globalTreasuryFundingApprovalRecorded: true,
      globalTreasuryFundingApproved: true,
      treasuryFundingApproved: true,
      treasuryFundingExecuted: false,
      fundingPayloadGenerated: false,
      fundsMoved: false
    }
  : {
      recordedAt: "",
      approver: "not recorded",
      approvalReference: "not recorded",
      fullLaunchLive: true,
      launchPageUrl: review.launchPageUrl || "",
      buyPageUrl: review.buyPageUrl || "",
      tradingLinkUrl: review.tradingLinkUrl || "",
      liquiditySafeAddress: postVerification.liquiditySafeAddress || "",
      executionTxHash: postVerification.executionTxHash || "",
      poolAddress: postVerification.poolAddress || "",
      poolLiquidityLive: postVerification.poolLiquidityLive || "",
      positionTokenId: postVerification.positionTokenId || "",
      globalTreasuryFundingApprovalRecorded: false,
      globalTreasuryFundingApproved: false,
      treasuryFundingApproved: false,
      treasuryFundingExecuted: false,
      fundingPayloadGenerated: false,
      fundsMoved: false
    };

const report = {
  schema: "astra-global-treasury-funding-approval-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "public-launch-finalized",
  publicStatement: approvalRecordPresent
    ? "AstraTreasury recorded global treasury funding approval. No funding payload has been generated, no Safe transaction has been submitted, treasury funding has not been executed, and no funds have been moved."
    : "AstraTreasury global treasury funding approval framework is ready. Approval has not yet been recorded.",
  summary: {
    approvalRecordPresent,
    globalTreasuryFundingApprovalRecorded: approvalRecordPresent,
    globalTreasuryFundingApproved: approvalRecordPresent,
    treasuryFundingApproved: approvalRecordPresent,
    treasuryFundingExecuted: false,
    fundingPayloadGenerated: false,
    fundsMoved: false,
    fullLaunchLive: true,
    fullLaunchApproved: true,
    buyPageActivated: true,
    publicTradingLive: true,
    launchPageUrl: approvalSummary.launchPageUrl,
    buyPageUrl: approvalSummary.buyPageUrl,
    tradingLinkUrl: approvalSummary.tradingLinkUrl,
    liquiditySafeAddress: approvalSummary.liquiditySafeAddress,
    executionTxHash: approvalSummary.executionTxHash,
    poolAddress: approvalSummary.poolAddress,
    poolLiquidityLive: approvalSummary.poolLiquidityLive,
    positionTokenId: approvalSummary.positionTokenId,
    dexLiquidityPostExecutionVerified: postVerification.liquidityPostExecutionVerified === true,
    liquidityAdded: postVerification.liquidityAdded === true,
    positionMinted: postVerification.positionMinted === true,
    nextRecommendedMilestone: "Global Treasury Funding Requirements Review",
    artifactCount: artifactHashes.length,
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length
  },
  globalTreasuryFundingApproval: {
    approvalHash,
    hashAlgorithm: "SHA-256",
    approvalSummary,
    requiredBeforeGlobalTreasuryFundingRequirementsReview: config.requiredBeforeGlobalTreasuryFundingRequirementsReview || {},
    hardStops: config.hardStops || {},
    approvalPrerequisites: approvalRecordPresent ? record.approvalPrerequisites : {},
    artifactHashes
  },
  checks,
  failures,
  currentStatuses: {
    globalTreasuryFundingApprovalReview: reviewStatus.status || "UNKNOWN",
    fullLaunchLive: fullLaunchLiveStatus.status || "UNKNOWN",
    fullLaunch: fullLaunchStatus.status || "UNKNOWN",
    dexLiquidityPostExecutionVerification: postStatus.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN"
  },
  restrictions: {
    fundingPayloadGenerated: false,
    treasuryFundingExecution: false,
    fundsMoved: false
  },
  safety: {
    approvalOnly: true,
    generatesFundingPayload: false,
    submitsSafeTransaction: false,
    executesGlobalTreasuryFunding: false,
    movesFunds: false
  }
};

writeJson(statusReportFile, report);
writeJson(publicJsonFile, report);

if (approvalRecordPresent) {
  writeJson(publicApprovedJsonFile, {
    schema: "astra-global-treasury-funding-approved-status-v0.1",
    generatedAt: report.generatedAt,
    status: "GLOBAL_TREASURY_FUNDING_APPROVED_NOT_EXECUTED_FUNDS_NOT_MOVED",
    summary: {
      globalTreasuryFundingApprovalRecorded: true,
      globalTreasuryFundingApproved: true,
      treasuryFundingApproved: true,
      treasuryFundingExecuted: false,
      fundingPayloadGenerated: false,
      fundsMoved: false,
      approvalHash: record.approvalHash
    }
  });

  writeJson(path.join(root, "public-docs", "treasury-funding-status.json"), {
    schema: "astra-treasury-funding-status-v0.1",
    generatedAt: report.generatedAt,
    status: "GLOBAL_TREASURY_FUNDING_APPROVED_NOT_EXECUTED_FUNDS_NOT_MOVED",
    treasuryFundingApproved: true,
    treasuryFundingExecuted: false,
    globalTreasuryFundingApproved: true,
    globalTreasuryFundingExecuted: false,
    fundingPayloadGenerated: false,
    fundsMoved: false,
    summary: {
      treasuryFundingApproved: true,
      treasuryFundingExecuted: false,
      globalTreasuryFundingApproved: true,
      globalTreasuryFundingExecuted: false,
      fundingPayloadGenerated: false,
      fundsMoved: false
    },
    approvalHash: record.approvalHash,
    approvalRecordFile: "reports/global-treasury-funding-approval/global-treasury-funding-approval-record.json"
  });

  writeJson(path.join(root, "public-docs", "full-launch-status.json"), {
    schema: "astra-full-launch-status-v0.1",
    generatedAt: report.generatedAt,
    status: "FULL_LAUNCH_LIVE_GLOBAL_TREASURY_FUNDING_APPROVED_NOT_EXECUTED",
    fullLaunchApproved: true,
    fullLaunchApprovalRecorded: true,
    fullLaunchLive: true,
    fullLaunchLiveRecorded: true,
    buyPageActivated: true,
    publicTradingLive: true,
    publicTradingApproved: true,
    publicTradingLinkApproved: true,
    buyPageUrl: approvalSummary.buyPageUrl,
    launchPageUrl: approvalSummary.launchPageUrl,
    tradingLinkUrl: approvalSummary.tradingLinkUrl,
    liquiditySafeAddress: approvalSummary.liquiditySafeAddress,
    poolAddress: approvalSummary.poolAddress,
    poolLiquidityLive: approvalSummary.poolLiquidityLive,
    positionTokenId: approvalSummary.positionTokenId,
    treasuryFundingApproved: true,
    treasuryFundingExecuted: false,
    fundingPayloadGenerated: false,
    fundsMoved: false,
    treasuryFundingApprovalHash: record.approvalHash
  });
}

const summaryRows = Object.entries(report.summary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const requiredRows = Object.entries(report.globalTreasuryFundingApproval.requiredBeforeGlobalTreasuryFundingRequirementsReview || {}).map(([key, value]) => {
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
  <title>AstraTreasury Global Treasury Funding Approval</title>
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
    <div class="badge">Funding approval · no payload · no funds moved</div>
    <h1>Global Treasury Funding Approval</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
    <p><strong>Approval hash:</strong> <code>${escapeHtml(approvalHash)}</code></p>
  </section>

  <section class="card">
    <h2>Summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${summaryRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Required before funding requirements review</h2>
    <table><thead><tr><th>Requirement</th><th>Value</th></tr></thead><tbody>${requiredRows}</tbody></table>
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
      This approval does not generate payloads, submit Safe transactions, execute funding, or move funds.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/global-treasury-funding-approval">/api/public/global-treasury-funding-approval</a></p>
    <p><a href="/global-treasury-funding-approval-review">Global Treasury Funding Approval Review</a></p>
    <p><a href="/launch">Launch</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Global Treasury Funding Approval");
console.log("==============================================");
console.log(`Status: ${report.status}`);
console.log(`Approval record present: ${approvalRecordPresent}`);
console.log(`Treasury funding approved: ${report.summary.treasuryFundingApproved}`);
console.log(`Treasury funding executed: ${report.summary.treasuryFundingExecuted}`);
console.log(`Funds moved: ${report.summary.fundsMoved}`);
console.log(`Report: ${statusReportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
