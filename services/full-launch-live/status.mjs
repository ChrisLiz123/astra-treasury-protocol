import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const recordRelativePath = "reports/full-launch-live/full-launch-live-record.json";
const liveEvidenceRelativePath = "reports/full-launch/live/full-launch-live.json";

const reportDir = path.join(root, "reports", "full-launch-live");
const statusReportFile = path.join(reportDir, "full-launch-live-status.json");

const publicJsonFile = path.join(root, "public-docs", "full-launch-live-status.json");
const publicHtmlFile = path.join(root, "public-docs", "full-launch-live.html");
const launchHtmlFile = path.join(root, "public-docs", "launch.html");

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
const liveEvidence = readJson(liveEvidenceRelativePath, {});
const finalized = Boolean(record && record.schema === "astra-full-launch-live-record-v0.1");

const approvalStatus = readJson("public-docs/full-launch-approval-status.json");
const readinessStatus = readJson("public-docs/full-launch-readiness-review-status.json");
const buyActivationStatus = readJson("public-docs/dex-buy-page-activation-live-status.json");
const publicTradingLiveStatus = readJson("public-docs/dex-public-trading-live-status.json");
const postStatus = readJson("public-docs/dex-liquidity-post-execution-verification-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");

const status = finalized
  ? record.status
  : "FULL_LAUNCH_LIVE_NOT_RECORDED";

const artifactPaths = [
  recordRelativePath,
  liveEvidenceRelativePath,
  "public-docs/full-launch-approval-status.json",
  "reports/full-launch-approval/full-launch-approval-record.json",
  "public-docs/full-launch-approved-status.json",
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
  "public-docs/buy.html",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json"
].filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths.map((artifactPath) => sha256File(artifactPath));

const publicPayload = {
  schema: "astra-full-launch-live-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "public-launch-finalized",
  publicStatement: finalized
    ? "AstraTreasury full launch is live. The buy page is active, public trading is live, liquidity is verified, and global treasury funding is not approved or executed."
    : "AstraTreasury full launch live finalization has not been recorded.",
  summary: {
    finalized,
    fullLaunchLiveRecorded: record?.fullLaunchLiveRecorded === true,
    fullLaunchLive: record?.fullLaunchLive === true,
    fullLaunchApproved: record?.fullLaunchApproved === true,
    launchPageUrl: record?.launchPageUrl || "",
    buyPageUrl: record?.buyPageUrl || "",
    tradingLinkUrl: record?.tradingLinkUrl || "",
    buyPageActivated: record?.buyPageActivated === true,
    publicTradingLive: record?.publicTradingLive === true,
    publicTradingApproved: record?.publicTradingApproved === true,
    publicTradingLinkApproved: record?.publicTradingLinkApproved === true,
    liquiditySafeAddress: record?.liquiditySafeAddress || "",
    executionTxHash: record?.executionTxHash || "",
    poolAddress: record?.poolAddress || "",
    poolLiquidityLive: record?.poolLiquidityLive || "",
    positionTokenId: record?.positionTokenId || "",
    positionOwnerLive: record?.positionOwnerLive || "",
    dexLiquidityPostExecutionVerified: record?.dexLiquidityPostExecutionVerified === true,
    liquidityAdded: record?.liquidityAdded === true,
    positionMinted: record?.positionMinted === true,
    treasuryFundingApproved: false,
    treasuryFundingExecuted: false,
    nextRecommendedMilestone: "Global Treasury Funding Approval Review",
    artifactCount: artifactHashes.length
  },
  fullLaunchLive: {
    finalizationHash: record?.finalizationHash || "",
    hashAlgorithm: "SHA-256",
    finalizedAt: record?.finalizedAt || "",
    finalizedBy: record?.finalizedBy || "",
    finalizationReference: record?.finalizationReference || "",
    finalizationPrerequisites: record?.finalizationPrerequisites || {},
    liveEvidence,
    artifactHashes
  },
  currentStatuses: {
    fullLaunchApproval: approvalStatus.status || "UNKNOWN",
    fullLaunchReadinessReview: readinessStatus.status || "UNKNOWN",
    dexBuyPageActivationLive: buyActivationStatus.status || "UNKNOWN",
    dexPublicTradingLive: publicTradingLiveStatus.status || "UNKNOWN",
    dexLiquidityPostExecutionVerification: postStatus.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN"
  },
  safety: {
    publicFinalizationOnly: true,
    approvesGlobalTreasuryFunding: false,
    executesGlobalTreasuryFunding: false
  }
};

writeJson(statusReportFile, publicPayload);
writeJson(publicJsonFile, publicPayload);

const summaryRows = Object.entries(publicPayload.summary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const prerequisiteRows = Object.entries(publicPayload.fullLaunchLive.finalizationPrerequisites || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const statusRows = Object.entries(publicPayload.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const sharedStyles = `
  :root { color-scheme: dark; --bg: #07101d; --surface: #0e1a2b; --border: rgba(148, 163, 184, 0.22); --text: #edf4fb; --muted: #9aaec4; --blue: #67a7ff; --green: #72f0a6; --yellow: #f4c35f; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
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
  .cta { display: inline-flex; margin-top: 14px; margin-right: 10px; padding: 14px 18px; border-radius: 14px; background: rgba(103,167,255,.16); border: 1px solid rgba(103,167,255,.35); color: #d9eaff; font-weight: 850; }
`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Full Launch Live</title>
  <style>${sharedStyles}</style>
</head>
<body>
<main>
  <section class="card">
    <div class="badge">Full launch live · treasury funding not approved</div>
    <h1>Full Launch Live</h1>
    <p>${escapeHtml(publicPayload.publicStatement)}</p>
    <p><strong>Finalization hash:</strong> <code>${escapeHtml(publicPayload.fullLaunchLive.finalizationHash)}</code></p>
    <a class="cta" href="/launch">Open Launch Page</a>
    <a class="cta" href="/buy">Open Buy Page</a>
  </section>

  <section class="card">
    <h2>Summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${summaryRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Finalization prerequisites</h2>
    <table><thead><tr><th>Requirement</th><th>Value</th></tr></thead><tbody>${prerequisiteRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table><thead><tr><th>Area</th><th>Status</th></tr></thead><tbody>${statusRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      Full launch is live. Global treasury funding remains not approved or executed.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/full-launch-live">/api/public/full-launch-live</a></p>
    <p><a href="/full-launch-approval">Full Launch Approval</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

const launchHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Launch</title>
  <meta name="robots" content="index,follow" />
  <style>${sharedStyles}</style>
</head>
<body>
<main>
  <section class="card">
    <div class="badge">AstraTreasury full launch is live</div>
    <h1>AstraTreasury is live</h1>
    <p>
      The buy page is active, public trading is live, and DEX liquidity has been verified.
      Global treasury funding is not approved or executed.
    </p>
    <a class="cta" href="/buy">Buy ASTRA</a>
    <a class="cta" href="${escapeHtml(publicPayload.summary.tradingLinkUrl)}" rel="noopener noreferrer">Open DEX trading link</a>
  </section>

  <section class="card">
    <h2>Launch evidence</h2>
    <table>
      <tbody>
        <tr><td>Buy page</td><td><code>${escapeHtml(publicPayload.summary.buyPageUrl)}</code></td></tr>
        <tr><td>Trading link</td><td><code>${escapeHtml(publicPayload.summary.tradingLinkUrl)}</code></td></tr>
        <tr><td>Pool</td><td><code>${escapeHtml(publicPayload.summary.poolAddress)}</code></td></tr>
        <tr><td>Position token ID</td><td><code>${escapeHtml(publicPayload.summary.positionTokenId)}</code></td></tr>
        <tr><td>Liquidity Safe</td><td><code>${escapeHtml(publicPayload.summary.liquiditySafeAddress)}</code></td></tr>
        <tr><td>Execution tx</td><td><code>${escapeHtml(publicPayload.summary.executionTxHash)}</code></td></tr>
      </tbody>
    </table>
    <div class="notice">This page is public launch finalization evidence. It is not investment advice.</div>
    <p><a href="/full-launch-live">View full launch live status</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(launchHtmlFile, launchHtml + "\n");

console.log("AstraTreasury Full Launch Live");
console.log("==============================");
console.log(`Status: ${publicPayload.status}`);
console.log(`Full launch live: ${publicPayload.summary.fullLaunchLive}`);
console.log(`Full launch approved: ${publicPayload.summary.fullLaunchApproved}`);
console.log(`Buy page activated: ${publicPayload.summary.buyPageActivated}`);
console.log(`Treasury funding approved: ${publicPayload.summary.treasuryFundingApproved}`);
console.log(`Report: ${statusReportFile}`);
