import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const recordRelativePath = "reports/full-launch-approval/full-launch-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const reportDir = path.join(root, "reports", "full-launch-approval");
const statusReportFile = path.join(reportDir, "full-launch-approval-status.json");

const publicJsonFile = path.join(root, "public-docs", "full-launch-approval-status.json");
const publicHtmlFile = path.join(root, "public-docs", "full-launch-approval.html");
const fullLaunchApprovedJsonFile = path.join(root, "public-docs", "full-launch-approved-status.json");

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

const config = readJson("configs/full-launch-approval.config.json");
const record = readJsonPath(recordPath);
const approvalRecordPresent = Boolean(record && record.schema === "astra-full-launch-approval-record-v0.1");

const readinessStatus = readJson("public-docs/full-launch-readiness-review-status.json");
const readiness = readJson("reports/full-launch-readiness-review/full-launch-readiness-review.json");
const buyActivationStatus = readJson("public-docs/dex-buy-page-activation-live-status.json");
const publicTradingLiveStatus = readJson("public-docs/dex-public-trading-live-status.json");
const postStatus = readJson("public-docs/dex-liquidity-post-execution-verification-status.json");
const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");

const artifactPaths = [
  "configs/full-launch-approval.config.json",
  "scripts/record-full-launch-approval.mjs",
  "public-docs/full-launch-readiness-review-status.json",
  "reports/full-launch-readiness-review/full-launch-readiness-review.json",
  "public-docs/dex-buy-page-activation-live-status.json",
  "reports/dex-buy-page-activation-live/dex-buy-page-activation-live-record.json",
  "public-docs/dex-public-trading-live-status.json",
  "reports/dex-public-trading/live/public-trading-live.json",
  "public-docs/dex-buy-page-activated-status.json",
  "reports/dex-buy-page/live/buy-page-activated.json",
  "public-docs/dex-liquidity-post-execution-verification-status.json",
  "reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json"
];

const missingArtifacts = artifactPaths.filter((artifactPath) => !fs.existsSync(path.join(root, artifactPath)));

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

check("Readiness review complete", readinessStatus.status === "FULL_LAUNCH_READINESS_REVIEW_COMPLETE_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED", {
  status: readinessStatus.status || "UNKNOWN"
});

check("Ready for full launch approval", readiness.readyForFullLaunchApproval === true, {
  readyForFullLaunchApproval: readiness.readyForFullLaunchApproval
});

check("Buy page activated", buyActivationStatus.status === "DEX_BUY_PAGE_ACTIVATION_LIVE_RECORDED_BUY_PAGE_ACTIVATED_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED", {
  status: buyActivationStatus.status || "UNKNOWN"
});

check("Public trading live", publicTradingLiveStatus.status === "DEX_PUBLIC_TRADING_LIVE_BUY_PAGE_ACTIVATED_FULL_LAUNCH_NOT_APPROVED", {
  status: publicTradingLiveStatus.status || "UNKNOWN"
});

check("Liquidity verified", postStatus.status === "DEX_LIQUIDITY_POST_EXECUTION_VERIFIED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING", {
  status: postStatus.status || "UNKNOWN"
});

check("Global treasury funding not approved/executed", treasuryFunding.treasuryFundingApproved === false && treasuryFunding.treasuryFundingExecuted === false, {
  treasuryFundingApproved: treasuryFunding.treasuryFundingApproved,
  treasuryFundingExecuted: treasuryFunding.treasuryFundingExecuted
});

check("Capability approvals remain false", capabilityMatrix.allCapabilityApprovalsFalse === true, {
  allCapabilityApprovalsFalse: capabilityMatrix.allCapabilityApprovalsFalse
});

const approvalPayload = {
  schema: "astra-full-launch-approval-public-payload-v0.1",
  approvalRecordPresent,
  fullLaunchApprovalRecorded: approvalRecordPresent,
  fullLaunchApproved: approvalRecordPresent,
  fullLaunchLive: false,
  buyPageUrl: record?.buyPageUrl || readiness.buyPageUrl || "",
  tradingLinkUrl: record?.tradingLinkUrl || readiness.tradingLinkUrl || "",
  liquiditySafeAddress: record?.liquiditySafeAddress || postVerification.liquiditySafeAddress || "",
  executionTxHash: record?.executionTxHash || postVerification.executionTxHash || "",
  poolAddress: record?.poolAddress || postVerification.poolAddress || "",
  poolLiquidityLive: record?.poolLiquidityLive || postVerification.poolLiquidityLive || "",
  positionTokenId: record?.positionTokenId || postVerification.positionTokenId || "",
  treasuryFundingApproved: false,
  treasuryFundingExecuted: false,
  artifactHashes
};

const approvalHash = sha256Json(approvalPayload);
const failures = checks.filter((item) => !item.pass);

const status = failures.length > 0
  ? "FULL_LAUNCH_APPROVAL_REVIEW_REQUIRED"
  : approvalRecordPresent
    ? "FULL_LAUNCH_APPROVED_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED"
    : "FULL_LAUNCH_APPROVAL_READY_PENDING_APPROVAL";

const approvalSummary = approvalRecordPresent
  ? {
      recordedAt: record.recordedAt,
      approver: record.approver,
      approvalReference: record.approvalReference,
      buyPageUrl: record.buyPageUrl,
      tradingLinkUrl: record.tradingLinkUrl,
      liquiditySafeAddress: record.liquiditySafeAddress,
      executionTxHash: record.executionTxHash,
      poolAddress: record.poolAddress,
      poolLiquidityLive: record.poolLiquidityLive,
      positionTokenId: record.positionTokenId,
      positionOwnerLive: record.positionOwnerLive,
      fullLaunchApprovalRecorded: true,
      fullLaunchApproved: true,
      fullLaunchLive: false,
      buyPageActivated: true,
      publicTradingLive: true,
      treasuryFundingApproved: false,
      treasuryFundingExecuted: false
    }
  : {
      recordedAt: "",
      approver: "not recorded",
      approvalReference: "not recorded",
      buyPageUrl: readiness.buyPageUrl || "",
      tradingLinkUrl: readiness.tradingLinkUrl || "",
      liquiditySafeAddress: postVerification.liquiditySafeAddress || "",
      executionTxHash: postVerification.executionTxHash || "",
      poolAddress: postVerification.poolAddress || "",
      poolLiquidityLive: postVerification.poolLiquidityLive || "",
      positionTokenId: postVerification.positionTokenId || "",
      positionOwnerLive: postVerification.positionOwnerLive || "",
      fullLaunchApprovalRecorded: false,
      fullLaunchApproved: false,
      fullLaunchLive: false,
      buyPageActivated: true,
      publicTradingLive: true,
      treasuryFundingApproved: false,
      treasuryFundingExecuted: false
    };

const report = {
  schema: "astra-full-launch-approval-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: approvalRecordPresent
    ? "AstraTreasury recorded full launch approval. The buy page is active, public trading is live, liquidity is verified, and global treasury funding is not approved or executed."
    : "AstraTreasury full launch approval framework is ready. Full launch approval has not yet been recorded.",
  summary: {
    approvalRecordPresent,
    fullLaunchApprovalRecorded: approvalRecordPresent,
    fullLaunchApproved: approvalRecordPresent,
    fullLaunchLive: false,
    buyPageActivated: true,
    publicTradingLive: true,
    publicTradingApproved: true,
    publicTradingLinkApproved: true,
    buyPageUrl: approvalSummary.buyPageUrl,
    tradingLinkUrl: approvalSummary.tradingLinkUrl,
    liquiditySafeAddress: approvalSummary.liquiditySafeAddress,
    executionTxHash: approvalSummary.executionTxHash,
    poolAddress: approvalSummary.poolAddress,
    poolLiquidityLive: approvalSummary.poolLiquidityLive,
    positionTokenId: approvalSummary.positionTokenId,
    positionOwnerLive: approvalSummary.positionOwnerLive,
    dexLiquidityPostExecutionVerified: postVerification.liquidityPostExecutionVerified === true,
    liquidityAdded: postVerification.liquidityAdded === true,
    positionMinted: postVerification.positionMinted === true,
    treasuryFundingApproved: false,
    treasuryFundingExecuted: false,
    nextRecommendedMilestone: "Full Launch Live / Public Finalization",
    artifactCount: artifactHashes.length,
    missingArtifactCount: missingArtifacts.length,
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length
  },
  fullLaunchApproval: {
    approvalHash,
    hashAlgorithm: "SHA-256",
    approvalSummary,
    requiredBeforeFullLaunchLive: config.requiredBeforeFullLaunchLive || {},
    hardStops: config.hardStops || {},
    approvalPrerequisites: approvalRecordPresent ? record.approvalPrerequisites : {},
    artifactHashes
  },
  checks,
  failures,
  missingArtifacts,
  currentStatuses: {
    fullLaunchReadinessReview: readinessStatus.status || "UNKNOWN",
    dexBuyPageActivationLive: buyActivationStatus.status || "UNKNOWN",
    dexPublicTradingLive: publicTradingLiveStatus.status || "UNKNOWN",
    dexLiquidityPostExecutionVerification: postStatus.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN"
  },
  restrictions: {
    globalTreasuryFunding: false,
    fullLaunchLive: false
  },
  safety: {
    approvalOnly: true,
    approvesGlobalTreasuryFunding: false,
    executesGlobalTreasuryFunding: false,
    finalizesFullLaunchLivePageNow: false
  }
};

writeJson(statusReportFile, report);
writeJson(publicJsonFile, report);

if (approvalRecordPresent) {
  writeJson(fullLaunchApprovedJsonFile, {
    schema: "astra-full-launch-approved-status-v0.1",
    generatedAt: report.generatedAt,
    status: "FULL_LAUNCH_APPROVED_TREASURY_FUNDING_NOT_APPROVED_FULL_LAUNCH_LIVE_NOT_FINALIZED",
    summary: {
      fullLaunchApprovalRecorded: true,
      fullLaunchApproved: true,
      fullLaunchLive: false,
      buyPageActivated: true,
      publicTradingLive: true,
      treasuryFundingApproved: false,
      treasuryFundingExecuted: false,
      approvalHash: record.approvalHash
    }
  });
}

const approvalRows = Object.entries(approvalSummary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td><code>${escapeHtml(value)}</code></td></tr>`;
}).join("");

const requiredRows = Object.entries(report.fullLaunchApproval.requiredBeforeFullLaunchLive).map(([key, value]) => {
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
  <title>AstraTreasury Full Launch Approval</title>
  <style>
    :root { color-scheme: dark; --bg: #08111f; --surface: #0e1a2b; --border: rgba(148, 163, 184, 0.2); --text: #edf4fb; --muted: #9aaec4; --blue: #67a7ff; --green: #72f0a6; --yellow: #f4c35f; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: linear-gradient(180deg, #07101d, var(--bg)); color: var(--text); }
    a { color: var(--blue); text-decoration: none; }
    main { width: min(1120px, calc(100% - 40px)); margin: 0 auto; padding: 44px 0 72px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 28px; box-shadow: 0 22px 70px rgba(0,0,0,.28); margin-bottom: 18px; }
    h1 { margin: 0 0 10px; font-size: 42px; letter-spacing: -1.2px; }
    h2 { margin: 0 0 14px; font-size: 24px; }
    p { color: var(--muted); line-height: 1.65; }
    .badge { display: inline-flex; padding: 8px 12px; border-radius: 999px; background: rgba(114,240,166,.08); border: 1px solid rgba(114,240,166,.22); color: var(--green); font-weight: 850; margin-bottom: 16px; }
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
    <div class="badge">Full launch approval · treasury funding not approved</div>
    <h1>Full Launch Approval</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
    <p><strong>Approval hash:</strong> <code>${escapeHtml(approvalHash)}</code></p>
  </section>

  <section class="card">
    <h2>Approval summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${approvalRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Required before full launch live</h2>
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
      Full launch approval is recorded only after approval is complete. Global treasury funding remains not approved or executed,
      and full-launch-live public finalization is a separate milestone.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/full-launch-approval">/api/public/full-launch-approval</a></p>
    <p><a href="/full-launch-readiness-review">Full Launch Readiness Review</a></p>
    <p><a href="/buy">Buy ASTRA</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Full Launch Approval");
console.log("==================================");
console.log(`Status: ${report.status}`);
console.log(`Approval record present: ${approvalRecordPresent}`);
console.log(`Full launch approved: ${report.summary.fullLaunchApproved}`);
console.log(`Full launch live: ${report.summary.fullLaunchLive}`);
console.log(`Treasury funding approved: ${report.summary.treasuryFundingApproved}`);
console.log(`Report: ${statusReportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
