import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const reviewRelativePath = "reports/full-launch-readiness-review/full-launch-readiness-review.json";

const reportDir = path.join(root, "reports", "full-launch-readiness-review");
const statusReportFile = path.join(reportDir, "full-launch-readiness-review-status.json");

const publicJsonFile = path.join(root, "public-docs", "full-launch-readiness-review-status.json");
const publicHtmlFile = path.join(root, "public-docs", "full-launch-readiness-review.html");

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
const reviewed = Boolean(review && review.schema === "astra-full-launch-readiness-review-v0.1");

const buyActivationStatus = readJson("public-docs/dex-buy-page-activation-live-status.json");
const buyPageActivatedStatus = readJson("public-docs/dex-buy-page-activated-status.json");
const publicTradingLiveStatus = readJson("public-docs/dex-public-trading-live-status.json");
const postStatus = readJson("public-docs/dex-liquidity-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");

const status = reviewed
  ? review.status
  : "FULL_LAUNCH_READINESS_REVIEW_NOT_RUN";

const artifactPaths = [
  reviewRelativePath,
  "public-docs/buy.html",
  "public-docs/dex-buy-page-activation-live-status.json",
  "reports/dex-buy-page-activation-live/dex-buy-page-activation-live-record.json",
  "public-docs/dex-buy-page-activated-status.json",
  "public-docs/dex-public-trading-live-status.json",
  "reports/dex-buy-page/live/buy-page-activated.json",
  "reports/dex-public-trading/live/public-trading-live.json",
  "public-docs/dex-buy-page-activation-approval-status.json",
  "reports/dex-buy-page-activation-approval/dex-buy-page-activation-approval-record.json",
  "public-docs/dex-public-trading-link-approval-status.json",
  "reports/dex-public-trading-link-approval/dex-public-trading-link-approval-record.json",
  "public-docs/dex-public-trading-approval-status.json",
  "reports/dex-public-trading-approval/dex-public-trading-approval-record.json",
  "public-docs/dex-liquidity-post-execution-verification-status.json",
  "reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json"
].filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths.map((artifactPath) => sha256File(artifactPath));

const publicPayload = {
  schema: "astra-full-launch-readiness-review-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: reviewed
    ? "AstraTreasury completed full launch readiness review. The buy page is active, public trading is live, and liquidity is verified. Full launch is not approved and global treasury funding is not approved or executed."
    : "AstraTreasury full launch readiness review has not completed successfully.",
  summary: {
    reviewed,
    fullLaunchReadinessReviewComplete: review?.fullLaunchReadinessReviewComplete === true,
    readyForFullLaunchApproval: review?.readyForFullLaunchApproval === true,
    buyPageActivated: review?.buyPageActivated === true,
    publicTradingLive: review?.publicTradingLive === true,
    publicTradingApproved: review?.publicTradingApproved === true,
    publicTradingLinkApproved: review?.publicTradingLinkApproved === true,
    buyPageUrl: review?.buyPageUrl || "",
    tradingLinkUrl: review?.tradingLinkUrl || "",
    liquiditySafeAddress: review?.liquiditySafeAddress || "",
    executionTxHash: review?.executionTxHash || "",
    poolAddress: review?.poolAddress || "",
    poolLiquidityLive: review?.poolLiquidityLive || "",
    positionTokenId: review?.positionTokenId || "",
    positionOwnerLive: review?.positionOwnerLive || "",
    liquidityAdded: review?.liquidityAdded === true,
    positionMinted: review?.positionMinted === true,
    treasuryFundingApproved: false,
    treasuryFundingExecuted: false,
    fullLaunchApproved: false,
    nextRecommendedMilestone: "Full Launch Approval",
    artifactCount: artifactHashes.length
  },
  fullLaunchReadinessReview: {
    reviewHash: review?.reviewHash || "",
    hashAlgorithm: "SHA-256",
    readinessChecks: review?.readinessChecks || {},
    readinessNotes: review?.readinessNotes || [],
    requiredBeforeFullLaunchApproval: review?.requiredBeforeFullLaunchApproval || {},
    artifactHashes
  },
  currentStatuses: {
    dexBuyPageActivationLive: buyActivationStatus.status || "UNKNOWN",
    dexBuyPageActivated: buyPageActivatedStatus.status || "UNKNOWN",
    dexPublicTradingLive: publicTradingLiveStatus.status || "UNKNOWN",
    dexLiquidityPostExecutionVerification: postStatus.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN"
  },
  restrictions: {
    globalTreasuryFunding: false,
    fullLaunch: false
  },
  safety: {
    reviewOnly: true,
    approvesGlobalTreasuryFunding: false,
    approvesFullLaunch: false
  }
};

writeJson(statusReportFile, publicPayload);
writeJson(publicJsonFile, publicPayload);

const summaryRows = Object.entries(publicPayload.summary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const checkRows = Object.entries(publicPayload.fullLaunchReadinessReview.readinessChecks || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const requiredRows = Object.entries(publicPayload.fullLaunchReadinessReview.requiredBeforeFullLaunchApproval || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const notesRows = (publicPayload.fullLaunchReadinessReview.readinessNotes || []).map((item) => {
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
  <title>AstraTreasury Full Launch Readiness Review</title>
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
    <div class="badge">Readiness reviewed · full launch not approved</div>
    <h1>Full Launch Readiness Review</h1>
    <p>${escapeHtml(publicPayload.publicStatement)}</p>
    <p><strong>Review hash:</strong> <code>${escapeHtml(publicPayload.fullLaunchReadinessReview.reviewHash)}</code></p>
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
    <h2>Required before full launch approval</h2>
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
      This is readiness review only. Full launch is not approved, and global treasury funding remains not approved or executed.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/full-launch-readiness-review">/api/public/full-launch-readiness-review</a></p>
    <p><a href="/dex-buy-page-activation-live">DEX Buy Page Activation Live</a></p>
    <p><a href="/buy">Buy ASTRA</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Full Launch Readiness Review");
console.log("==========================================");
console.log(`Status: ${publicPayload.status}`);
console.log(`Readiness review complete: ${publicPayload.summary.fullLaunchReadinessReviewComplete}`);
console.log(`Ready for full launch approval: ${publicPayload.summary.readyForFullLaunchApproval}`);
console.log(`Buy page activated: ${publicPayload.summary.buyPageActivated}`);
console.log(`Public trading live: ${publicPayload.summary.publicTradingLive}`);
console.log(`Full launch approved: ${publicPayload.summary.fullLaunchApproved}`);
console.log(`Report: ${statusReportFile}`);
