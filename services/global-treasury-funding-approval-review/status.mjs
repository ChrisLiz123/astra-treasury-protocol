import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const reviewRelativePath = "reports/global-treasury-funding-approval-review/global-treasury-funding-approval-review.json";

const reportDir = path.join(root, "reports", "global-treasury-funding-approval-review");
const statusReportFile = path.join(reportDir, "global-treasury-funding-approval-review-status.json");

const publicJsonFile = path.join(root, "public-docs", "global-treasury-funding-approval-review-status.json");
const publicHtmlFile = path.join(root, "public-docs", "global-treasury-funding-approval-review.html");

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

const review = readJson(reviewRelativePath, null);
const reviewed = Boolean(review && review.schema === "astra-global-treasury-funding-approval-review-v0.1");

const fullLaunchLiveStatus = readJson("public-docs/full-launch-live-status.json");
const fullLaunchStatus = readJson("public-docs/full-launch-status.json");
const fullLaunchApprovalStatus = readJson("public-docs/full-launch-approval-status.json");
const postStatus = readJson("public-docs/dex-liquidity-post-execution-verification-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");

const status = reviewed
  ? review.status
  : "GLOBAL_TREASURY_FUNDING_APPROVAL_REVIEW_NOT_RUN";

const artifactPaths = [
  reviewRelativePath,
  "public-docs/full-launch-live-status.json",
  "reports/full-launch-live/full-launch-live-record.json",
  "reports/full-launch/live/full-launch-live.json",
  "public-docs/full-launch-status.json",
  "public-docs/full-launch-approval-status.json",
  "reports/full-launch-approval/full-launch-approval-record.json",
  "public-docs/full-launch-readiness-review-status.json",
  "reports/full-launch-readiness-review/full-launch-readiness-review.json",
  "public-docs/dex-buy-page-activation-live-status.json",
  "reports/dex-buy-page-activation-live/dex-buy-page-activation-live-record.json",
  "public-docs/dex-public-trading-live-status.json",
  "reports/dex-public-trading/live/public-trading-live.json",
  "public-docs/dex-liquidity-post-execution-verification-status.json",
  "reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/launch.html",
  "public-docs/buy.html"
].filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths.map((artifactPath) => sha256File(artifactPath));

const publicPayload = {
  schema: "astra-global-treasury-funding-approval-review-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "public-launch-finalized",
  publicStatement: reviewed
    ? "AstraTreasury completed global treasury funding approval review. Full launch is live, public trading is live, liquidity is verified, and global treasury funding is not approved or executed."
    : "AstraTreasury global treasury funding approval review has not completed successfully.",
  summary: {
    reviewed,
    globalTreasuryFundingApprovalReviewComplete: review?.globalTreasuryFundingApprovalReviewComplete === true,
    readyForGlobalTreasuryFundingApproval: review?.readyForGlobalTreasuryFundingApproval === true,
    fullLaunchLive: review?.fullLaunchLive === true,
    fullLaunchApproved: review?.fullLaunchApproved === true,
    buyPageActivated: review?.buyPageActivated === true,
    publicTradingLive: review?.publicTradingLive === true,
    launchPageUrl: review?.launchPageUrl || "",
    buyPageUrl: review?.buyPageUrl || "",
    tradingLinkUrl: review?.tradingLinkUrl || "",
    liquiditySafeAddress: review?.liquiditySafeAddress || "",
    executionTxHash: review?.executionTxHash || "",
    poolAddress: review?.poolAddress || "",
    poolLiquidityLive: review?.poolLiquidityLive || "",
    positionTokenId: review?.positionTokenId || "",
    positionOwnerLive: review?.positionOwnerLive || "",
    dexLiquidityPostExecutionVerified: review?.dexLiquidityPostExecutionVerified === true,
    liquidityAdded: review?.liquidityAdded === true,
    positionMinted: review?.positionMinted === true,
    treasuryFundingApproved: false,
    treasuryFundingExecuted: false,
    fundsMoved: false,
    nextRecommendedMilestone: "Global Treasury Funding Approval",
    artifactCount: artifactHashes.length
  },
  globalTreasuryFundingApprovalReview: {
    reviewHash: review?.reviewHash || "",
    hashAlgorithm: "SHA-256",
    readinessChecks: review?.readinessChecks || {},
    readinessNotes: review?.readinessNotes || [],
    requiredBeforeGlobalTreasuryFundingApproval: review?.requiredBeforeGlobalTreasuryFundingApproval || {},
    artifactHashes
  },
  currentStatuses: {
    fullLaunchLive: fullLaunchLiveStatus.status || "UNKNOWN",
    fullLaunch: fullLaunchStatus.status || "UNKNOWN",
    fullLaunchApproval: fullLaunchApprovalStatus.status || "UNKNOWN",
    dexLiquidityPostExecutionVerification: postStatus.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN"
  },
  restrictions: {
    globalTreasuryFundingApproval: false,
    globalTreasuryFundingExecution: false,
    fundsMoved: false
  },
  safety: {
    reviewOnly: true,
    approvesGlobalTreasuryFunding: false,
    executesGlobalTreasuryFunding: false,
    generatesFundingPayload: false,
    movesFunds: false
  }
};

writeJson(statusReportFile, publicPayload);
writeJson(publicJsonFile, publicPayload);

const summaryRows = Object.entries(publicPayload.summary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const checkRows = Object.entries(publicPayload.globalTreasuryFundingApprovalReview.readinessChecks || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const requiredRows = Object.entries(publicPayload.globalTreasuryFundingApprovalReview.requiredBeforeGlobalTreasuryFundingApproval || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const notesRows = (publicPayload.globalTreasuryFundingApprovalReview.readinessNotes || []).map((item) => {
  return `<tr><td>${escapeHtml(item)}</td></tr>`;
}).join("");

const statusRows = Object.entries(publicPayload.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Global Treasury Funding Approval Review</title>
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
    <div class="badge">Funding approval review · funds not moved</div>
    <h1>Global Treasury Funding Approval Review</h1>
    <p>${escapeHtml(publicPayload.publicStatement)}</p>
    <p><strong>Review hash:</strong> <code>${escapeHtml(publicPayload.globalTreasuryFundingApprovalReview.reviewHash)}</code></p>
  </section>

  <section class="card">
    <h2>Summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${summaryRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Readiness checks</h2>
    <table><thead><tr><th>Check</th><th>Status</th></tr></thead><tbody>${checkRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Required before global treasury funding approval</h2>
    <table><thead><tr><th>Requirement</th><th>Value</th></tr></thead><tbody>${requiredRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Readiness notes</h2>
    <table><thead><tr><th>Note</th></tr></thead><tbody>${notesRows || '<tr><td>No notes.</td></tr>'}</tbody></table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table><thead><tr><th>Area</th><th>Status</th></tr></thead><tbody>${statusRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This is approval review only. Global treasury funding is not approved, not executed, and no funds have been moved.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/global-treasury-funding-approval-review">/api/public/global-treasury-funding-approval-review</a></p>
    <p><a href="/full-launch-live">Full Launch Live</a></p>
    <p><a href="/launch">Launch</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Global Treasury Funding Approval Review");
console.log("=====================================================");
console.log(`Status: ${publicPayload.status}`);
console.log(`Review complete: ${publicPayload.summary.globalTreasuryFundingApprovalReviewComplete}`);
console.log(`Ready for funding approval: ${publicPayload.summary.readyForGlobalTreasuryFundingApproval}`);
console.log(`Treasury funding approved: ${publicPayload.summary.treasuryFundingApproved}`);
console.log(`Treasury funding executed: ${publicPayload.summary.treasuryFundingExecuted}`);
console.log(`Report: ${statusReportFile}`);
