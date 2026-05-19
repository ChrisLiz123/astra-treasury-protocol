import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const readinessRelativePath = "reports/dex-public-trading-readiness-review/dex-public-trading-readiness-review.json";
const reportDir = path.join(root, "reports", "dex-public-trading-readiness-review");
const statusReportFile = path.join(reportDir, "dex-public-trading-readiness-review-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-public-trading-readiness-review-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-public-trading-readiness-review.html");

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

const readiness = readJson(readinessRelativePath, null);
const reviewed = Boolean(readiness && readiness.schema === "astra-dex-public-trading-readiness-review-v0.1");

const postStatus = readJson("public-docs/dex-liquidity-post-execution-verification-status.json");
const executionLiveStatus = readJson("public-docs/dex-liquidity-safe-execution-live-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");

const status = reviewed
  ? readiness.status
  : "DEX_PUBLIC_TRADING_READINESS_REVIEW_NOT_RUN";

const artifactPaths = [
  readinessRelativePath,
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
].filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths.map((artifactPath) => sha256File(artifactPath));

const publicPayload = {
  schema: "astra-dex-public-trading-readiness-review-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: reviewed
    ? "AstraTreasury completed DEX public trading readiness review. Liquidity is added and the position is verified. Public trading is not approved, the buy page is not activated, and full launch is not approved."
    : "AstraTreasury DEX public trading readiness review has not completed successfully.",
  summary: {
    reviewed,
    publicTradingReadinessReviewComplete: readiness?.publicTradingReadinessReviewComplete === true,
    readyForPublicTradingApproval: readiness?.readyForPublicTradingApproval === true,
    liquidityPostExecutionVerified: readiness?.liquidityPostExecutionVerified === true,
    liquiditySafeTransactionExecuted: readiness?.liquiditySafeTransactionExecuted === true,
    liquidityAdded: readiness?.liquidityAdded === true,
    positionMinted: readiness?.positionMinted === true,
    liquiditySafeAddress: readiness?.liquiditySafeAddress || "",
    executionTxHash: readiness?.executionTxHash || "",
    poolAddress: readiness?.poolAddress || "",
    poolLiquidityLive: readiness?.poolLiquidityLive || "",
    positionTokenId: readiness?.positionTokenId || "",
    positionOwnerLive: readiness?.positionOwnerLive || "",
    positionLiquidity: readiness?.positionDetailsLive?.liquidity || "",
    publicTradingApproved: false,
    publicTradingLive: false,
    buyPageActivated: false,
    fullLaunchApproved: false,
    nextRecommendedMilestone: "DEX Public Trading Approval",
    artifactCount: artifactHashes.length
  },
  dexPublicTradingReadinessReview: {
    readinessReviewHash: readiness?.readinessReviewHash || "",
    hashAlgorithm: "SHA-256",
    readinessChecks: readiness?.readinessChecks || {},
    positionDetailsLive: readiness?.positionDetailsLive || {},
    tokenBalancesAtReadinessReview: readiness?.tokenBalancesAtReadinessReview || {},
    requiredBeforePublicTradingApproval: readiness?.requiredBeforePublicTradingApproval || {},
    recommendations: readiness?.recommendations || [],
    artifactHashes
  },
  currentStatuses: {
    dexLiquidityPostExecutionVerification: postStatus.status || "UNKNOWN",
    dexLiquiditySafeExecutionLive: executionLiveStatus.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN"
  },
  restrictions: {
    publicTrading: false,
    buyPageActivation: false,
    globalTreasuryFunding: false,
    fullLaunch: false
  },
  safety: {
    reviewOnly: true,
    approvesPublicTrading: false,
    activatesBuyPage: false,
    approvesGlobalTreasuryFunding: false,
    approvesFullLaunch: false
  }
};

writeJson(statusReportFile, publicPayload);
writeJson(publicJsonFile, publicPayload);

const summaryRows = Object.entries(publicPayload.summary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const positionRows = Object.entries(publicPayload.dexPublicTradingReadinessReview.positionDetailsLive || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td><code>${escapeHtml(value)}</code></td></tr>`;
}).join("");

const checkRows = Object.entries(publicPayload.dexPublicTradingReadinessReview.readinessChecks || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const requiredRows = Object.entries(publicPayload.dexPublicTradingReadinessReview.requiredBeforePublicTradingApproval || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const recommendationRows = (publicPayload.dexPublicTradingReadinessReview.recommendations || []).map((item) => {
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
  <title>AstraTreasury DEX Public Trading Readiness Review</title>
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
    <div class="badge">Readiness reviewed · public trading not approved</div>
    <h1>DEX Public Trading Readiness Review</h1>
    <p>${escapeHtml(publicPayload.publicStatement)}</p>
    <p><strong>Readiness review hash:</strong> <code>${escapeHtml(publicPayload.dexPublicTradingReadinessReview.readinessReviewHash)}</code></p>
  </section>

  <section class="card">
    <h2>Summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${summaryRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Position details</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${positionRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Readiness checks</h2>
    <table><thead><tr><th>Check</th><th>Status</th></tr></thead><tbody>${checkRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Required before public trading approval</h2>
    <table><thead><tr><th>Requirement</th><th>Value</th></tr></thead><tbody>${requiredRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Recommendations</h2>
    <table><thead><tr><th>Recommendation</th></tr></thead><tbody>${recommendationRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table><thead><tr><th>Area</th><th>Status</th></tr></thead><tbody>${statusRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This readiness review does not approve public trading. The buy page is not activated,
      global treasury funding is not approved, and full launch is not approved.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-public-trading-readiness-review">/api/public/dex-public-trading-readiness-review</a></p>
    <p><a href="/dex-liquidity-post-execution-verification">DEX Liquidity Post-Execution Verification</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Public Trading Readiness Review");
console.log("=================================================");
console.log(`Status: ${publicPayload.status}`);
console.log(`Ready for public trading approval: ${publicPayload.summary.readyForPublicTradingApproval}`);
console.log(`Liquidity added: ${publicPayload.summary.liquidityAdded}`);
console.log(`Position minted: ${publicPayload.summary.positionMinted}`);
console.log(`Public trading approved: ${publicPayload.summary.publicTradingApproved}`);
console.log(`Report: ${statusReportFile}`);
