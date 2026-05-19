import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const recordRelativePath = "reports/dex-public-trading-link-approval/dex-public-trading-link-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const reportDir = path.join(root, "reports", "dex-public-trading-link-approval");
const statusReportFile = path.join(reportDir, "dex-public-trading-link-approval-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-public-trading-link-approval-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-public-trading-link-approval.html");

fs.mkdirSync(reportDir, { recursive: true });

const artifactPaths = [
  "configs/dex-public-trading-link-approval.config.json",
  "scripts/record-dex-public-trading-link-approval.mjs",
  "public-docs/dex-public-trading-approval-status.json",
  "reports/dex-public-trading-approval/dex-public-trading-approval-record.json",
  "public-docs/dex-public-trading-readiness-review-status.json",
  "reports/dex-public-trading-readiness-review/dex-public-trading-readiness-review.json",
  "public-docs/dex-liquidity-post-execution-verification-status.json",
  "reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json",
  "public-docs/dex-liquidity-safe-execution-live-status.json",
  "reports/dex-liquidity-safe-execution-live/dex-liquidity-safe-execution-live-record.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json"
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

const config = readJson("configs/dex-public-trading-link-approval.config.json");
const record = readJsonPath(recordPath);
const approvalRecordPresent = Boolean(record && record.schema === "astra-dex-public-trading-link-approval-record-v0.1");

const publicTradingApprovalStatus = readJson("public-docs/dex-public-trading-approval-status.json");
const publicTradingApproval = readJson("reports/dex-public-trading-approval/dex-public-trading-approval-record.json");
const readinessStatus = readJson("public-docs/dex-public-trading-readiness-review-status.json");
const postStatus = readJson("public-docs/dex-liquidity-post-execution-verification-status.json");
const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");

const checks = [];

function check(name, pass, details = {}) {
  checks.push({ name, pass: Boolean(pass), details });
}

check("Framework prepared", config.approvalPrepared === true && config.approvalOnly === true, {
  approvalPrepared: config.approvalPrepared,
  approvalOnly: config.approvalOnly
});

check("Public trading approval recorded", publicTradingApprovalStatus.status === "DEX_PUBLIC_TRADING_APPROVED_LIQUIDITY_VERIFIED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED", {
  status: publicTradingApprovalStatus.status || "UNKNOWN"
});

check("Public trading approved", publicTradingApproval.publicTradingApproved === true, {
  publicTradingApproved: publicTradingApproval.publicTradingApproved
});

check("Post-execution liquidity verified", postStatus.status === "DEX_LIQUIDITY_POST_EXECUTION_VERIFIED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING", {
  status: postStatus.status || "UNKNOWN"
});

check("Liquidity and position live", postVerification.liquidityAdded === true && postVerification.positionMinted === true && BigInt(String(postVerification.poolLiquidityLive || "0")) > 0n, {
  liquidityAdded: postVerification.liquidityAdded,
  positionMinted: postVerification.positionMinted,
  poolLiquidityLive: postVerification.poolLiquidityLive
});

check("Buy page and full launch not active", fullLaunch.fullLaunchApproved === false, {
  fullLaunchApproved: fullLaunch.fullLaunchApproved
});

check("Global treasury funding not approved/executed", treasuryFunding.treasuryFundingApproved === false && treasuryFunding.treasuryFundingExecuted === false, {
  treasuryFundingApproved: treasuryFunding.treasuryFundingApproved,
  treasuryFundingExecuted: treasuryFunding.treasuryFundingExecuted
});

check("Capability approvals remain false", capabilityMatrix.allCapabilityApprovalsFalse === true, {
  allCapabilityApprovalsFalse: capabilityMatrix.allCapabilityApprovalsFalse
});

const forbiddenFiles = [
  "public-docs/dex-public-trading-live-status.json",
  "public-docs/dex-buy-page-activated-status.json",
  "public-docs/full-launch-approved-status.json"
];

const forbiddenArtifactsPresent = forbiddenFiles.filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

check("No public-trading-live/buy-page/full-launch artifacts present", forbiddenArtifactsPresent.length === 0, {
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
  schema: "astra-dex-public-trading-link-approval-public-payload-v0.1",
  approvalRecordPresent,
  publicTradingLinkApprovalRecorded: approvalRecordPresent,
  publicTradingApproved: true,
  publicTradingLinkApproved: approvalRecordPresent,
  tradingLinkUrl: record?.tradingLinkUrl || "",
  liquiditySafeAddress: record?.liquiditySafeAddress || postVerification.liquiditySafeAddress || "",
  executionTxHash: record?.executionTxHash || postVerification.executionTxHash || "",
  poolAddress: record?.poolAddress || postVerification.poolAddress || "",
  poolLiquidityLive: record?.poolLiquidityLive || postVerification.poolLiquidityLive || "",
  positionTokenId: record?.positionTokenId || postVerification.positionTokenId || "",
  publicTradingLive: false,
  buyPageActivated: false,
  fullLaunchApproved: false,
  artifactHashes
};

const approvalHash = sha256Json(approvalPayload);
const failures = checks.filter((item) => !item.pass);

const status = failures.length > 0
  ? "DEX_PUBLIC_TRADING_LINK_APPROVAL_REVIEW_REQUIRED"
  : approvalRecordPresent
    ? "DEX_PUBLIC_TRADING_LINK_APPROVED_PUBLIC_TRADING_APPROVED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED"
    : "DEX_PUBLIC_TRADING_LINK_APPROVAL_READY_PENDING_APPROVAL";

const approvalSummary = approvalRecordPresent
  ? {
      recordedAt: record.recordedAt,
      approver: record.approver,
      approvalReference: record.approvalReference,
      tradingLinkUrl: record.tradingLinkUrl,
      liquiditySafeAddress: record.liquiditySafeAddress,
      executionTxHash: record.executionTxHash,
      poolAddress: record.poolAddress,
      poolLiquidityLive: record.poolLiquidityLive,
      positionTokenId: record.positionTokenId,
      positionOwnerLive: record.positionOwnerLive,
      publicTradingApproved: true,
      publicTradingLinkApprovalRecorded: true,
      publicTradingLinkApproved: true,
      publicTradingLive: false,
      buyPageActivated: false,
      fullLaunchApproved: false
    }
  : {
      recordedAt: "",
      approver: "not recorded",
      approvalReference: "not recorded",
      tradingLinkUrl: "",
      liquiditySafeAddress: postVerification.liquiditySafeAddress || "",
      executionTxHash: postVerification.executionTxHash || "",
      poolAddress: postVerification.poolAddress || "",
      poolLiquidityLive: postVerification.poolLiquidityLive || "",
      positionTokenId: postVerification.positionTokenId || "",
      positionOwnerLive: postVerification.positionOwnerLive || "",
      publicTradingApproved: true,
      publicTradingLinkApprovalRecorded: false,
      publicTradingLinkApproved: false,
      publicTradingLive: false,
      buyPageActivated: false,
      fullLaunchApproved: false
    };

const report = {
  schema: "astra-dex-public-trading-link-approval-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: approvalRecordPresent
    ? "AstraTreasury approved the DEX public trading link after verified liquidity execution and public trading approval. The buy page is not activated and full launch is not approved."
    : "AstraTreasury DEX public trading link approval framework is ready. Public trading link approval has not yet been recorded.",
  summary: {
    approvalRecordPresent,
    publicTradingLinkApprovalRecorded: approvalRecordPresent,
    publicTradingApproved: true,
    publicTradingLinkApproved: approvalRecordPresent,
    tradingLinkUrl: approvalSummary.tradingLinkUrl,
    liquiditySafeAddress: approvalSummary.liquiditySafeAddress,
    executionTxHash: approvalSummary.executionTxHash,
    poolAddress: approvalSummary.poolAddress,
    poolLiquidityLive: approvalSummary.poolLiquidityLive,
    positionTokenId: approvalSummary.positionTokenId,
    positionOwnerLive: approvalSummary.positionOwnerLive,
    dexPublicTradingApprovalRecorded: publicTradingApproval.publicTradingApprovalRecorded === true,
    dexLiquidityPostExecutionVerified: postVerification.liquidityPostExecutionVerified === true,
    liquidityAdded: postVerification.liquidityAdded === true,
    positionMinted: postVerification.positionMinted === true,
    publicTradingLive: false,
    buyPageActivated: false,
    fullLaunchApproved: false,
    nextRecommendedMilestone: "DEX Buy Page Activation Approval",
    artifactCount: artifactHashes.length,
    missingArtifactCount: missingArtifacts.length,
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length
  },
  dexPublicTradingLinkApproval: {
    approvalHash,
    hashAlgorithm: "SHA-256",
    approvalSummary,
    requiredBeforeBuyPageActivationApproval: config.requiredBeforeBuyPageActivationApproval || {},
    hardStops: config.hardStops || {},
    approvalPrerequisites: approvalRecordPresent ? record.approvalPrerequisites : {},
    artifactHashes
  },
  checks,
  failures,
  missingArtifacts,
  currentStatuses: {
    dexPublicTradingApproval: publicTradingApprovalStatus.status || "UNKNOWN",
    dexPublicTradingReadinessReview: readinessStatus.status || "UNKNOWN",
    dexLiquidityPostExecutionVerification: postStatus.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN"
  },
  restrictions: {
    publicTradingLive: false,
    buyPageActivation: false,
    globalTreasuryFunding: false,
    fullLaunch: false
  },
  safety: {
    approvalOnly: true,
    activatesBuyPage: false,
    approvesGlobalTreasuryFunding: false,
    approvesFullLaunch: false
  }
};

writeJson(statusReportFile, report);
writeJson(publicJsonFile, report);

const approvalRows = Object.entries(approvalSummary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td><code>${escapeHtml(value)}</code></td></tr>`;
}).join("");

const requiredRows = Object.entries(report.dexPublicTradingLinkApproval.requiredBeforeBuyPageActivationApproval).map(([key, value]) => {
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
  <title>AstraTreasury DEX Public Trading Link Approval</title>
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
    <div class="badge">Trading link approval · buy page not activated</div>
    <h1>DEX Public Trading Link Approval</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
    <p><strong>Approval hash:</strong> <code>${escapeHtml(approvalHash)}</code></p>
  </section>

  <section class="card">
    <h2>Approval summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${approvalRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Required before buy page activation approval</h2>
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
      This approval does not activate the buy page, does not approve global treasury funding,
      and does not approve full launch.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-public-trading-link-approval">/api/public/dex-public-trading-link-approval</a></p>
    <p><a href="/dex-public-trading-approval">DEX Public Trading Approval</a></p>
    <p><a href="/dex-public-trading-readiness-review">DEX Public Trading Readiness Review</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Public Trading Link Approval");
console.log("==============================================");
console.log(`Status: ${report.status}`);
console.log(`Approval record present: ${approvalRecordPresent}`);
console.log(`Public trading approved: ${report.summary.publicTradingApproved}`);
console.log(`Public trading link approved: ${report.summary.publicTradingLinkApproved}`);
console.log(`Buy page activated: ${report.summary.buyPageActivated}`);
console.log(`Full launch approved: ${report.summary.fullLaunchApproved}`);
console.log(`Report: ${statusReportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
