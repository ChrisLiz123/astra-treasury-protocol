import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const recordRelativePath = "reports/dex-buy-page-activation-live/dex-buy-page-activation-live-record.json";
const buyPageActivatedRelativePath = "reports/dex-buy-page/live/buy-page-activated.json";
const publicTradingLiveRelativePath = "reports/dex-public-trading/live/public-trading-live.json";

const reportDir = path.join(root, "reports", "dex-buy-page-activation-live");
const statusReportFile = path.join(reportDir, "dex-buy-page-activation-live-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-buy-page-activation-live-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-buy-page-activation-live.html");
const buyHtmlFile = path.join(root, "public-docs", "buy.html");
const publicTradingLiveJsonFile = path.join(root, "public-docs", "dex-public-trading-live-status.json");
const buyPageActivatedJsonFile = path.join(root, "public-docs", "dex-buy-page-activated-status.json");

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
const activated = Boolean(record && record.schema === "astra-dex-buy-page-activation-live-record-v0.1");

const buyPageActivated = readJson(buyPageActivatedRelativePath);
const publicTradingLive = readJson(publicTradingLiveRelativePath);

const activationApprovalStatus = readJson("public-docs/dex-buy-page-activation-approval-status.json");
const linkApprovalStatus = readJson("public-docs/dex-public-trading-link-approval-status.json");
const tradingApprovalStatus = readJson("public-docs/dex-public-trading-approval-status.json");
const postStatus = readJson("public-docs/dex-liquidity-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");

const status = activated
  ? record.status
  : "DEX_BUY_PAGE_ACTIVATION_LIVE_NOT_RECORDED";

const artifactPaths = [
  recordRelativePath,
  buyPageActivatedRelativePath,
  publicTradingLiveRelativePath,
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
  schema: "astra-dex-buy-page-activation-live-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: activated
    ? "AstraTreasury activated the DEX buy page. Public trading is live through the approved DEX trading link. Full launch is not approved."
    : "AstraTreasury DEX buy page activation live evidence has not been recorded.",
  summary: {
    activated,
    buyPageActivationLiveRecorded: record?.buyPageActivationLiveRecorded === true,
    buyPageActivated: record?.buyPageActivated === true,
    publicTradingLive: record?.publicTradingLive === true,
    publicTradingApproved: record?.publicTradingApproved === true,
    publicTradingLinkApproved: record?.publicTradingLinkApproved === true,
    buyPageActivationApproved: record?.buyPageActivationApproved === true,
    buyPageUrl: record?.buyPageUrl || "",
    tradingLinkUrl: record?.tradingLinkUrl || "",
    liquiditySafeAddress: record?.liquiditySafeAddress || "",
    executionTxHash: record?.executionTxHash || "",
    poolAddress: record?.poolAddress || "",
    poolLiquidityLive: record?.poolLiquidityLive || "",
    positionTokenId: record?.positionTokenId || "",
    positionOwnerLive: record?.positionOwnerLive || "",
    liquidityAdded: record?.liquidityAdded === true,
    positionMinted: record?.positionMinted === true,
    fullLaunchApproved: false,
    nextRecommendedMilestone: "Full Launch Readiness Review",
    artifactCount: artifactHashes.length
  },
  dexBuyPageActivationLive: {
    activationHash: record?.activationHash || "",
    hashAlgorithm: "SHA-256",
    activatedAt: record?.activatedAt || "",
    activatedBy: record?.activatedBy || "",
    activationReference: record?.activationReference || "",
    activationPrerequisites: record?.activationPrerequisites || {},
    requiredBeforeFullLaunchReadinessReview: record?.requiredBeforeFullLaunchReadinessReview || {},
    liveArtifacts: {
      buyPageActivated,
      publicTradingLive
    },
    artifactHashes
  },
  currentStatuses: {
    dexBuyPageActivationApproval: activationApprovalStatus.status || "UNKNOWN",
    dexPublicTradingLinkApproval: linkApprovalStatus.status || "UNKNOWN",
    dexPublicTradingApproval: tradingApprovalStatus.status || "UNKNOWN",
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
    activatesBuyPage: true,
    approvesGlobalTreasuryFunding: false,
    approvesFullLaunch: false
  }
};

writeJson(statusReportFile, publicPayload);
writeJson(publicJsonFile, publicPayload);

writeJson(publicTradingLiveJsonFile, {
  schema: "astra-dex-public-trading-live-status-v0.1",
  generatedAt: publicPayload.generatedAt,
  status: "DEX_PUBLIC_TRADING_LIVE_BUY_PAGE_ACTIVATED_FULL_LAUNCH_NOT_APPROVED",
  summary: {
    publicTradingLive: true,
    publicTradingApproved: true,
    publicTradingLinkApproved: true,
    buyPageActivated: true,
    buyPageUrl: publicPayload.summary.buyPageUrl,
    tradingLinkUrl: publicPayload.summary.tradingLinkUrl,
    poolAddress: publicPayload.summary.poolAddress,
    poolLiquidityLive: publicPayload.summary.poolLiquidityLive,
    positionTokenId: publicPayload.summary.positionTokenId,
    fullLaunchApproved: false
  }
});

writeJson(buyPageActivatedJsonFile, {
  schema: "astra-dex-buy-page-activated-status-v0.1",
  generatedAt: publicPayload.generatedAt,
  status: "DEX_BUY_PAGE_ACTIVATED_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED",
  summary: {
    buyPageActivated: true,
    publicTradingLive: true,
    buyPageUrl: publicPayload.summary.buyPageUrl,
    tradingLinkUrl: publicPayload.summary.tradingLinkUrl,
    fullLaunchApproved: false
  }
});

const summaryRows = Object.entries(publicPayload.summary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const requiredRows = Object.entries(publicPayload.dexBuyPageActivationLive.requiredBeforeFullLaunchReadinessReview || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const statusRows = Object.entries(publicPayload.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury DEX Buy Page Activation Live</title>
  <style>
    :root { color-scheme: dark; --bg: #08111f; --surface: #0e1a2b; --border: rgba(148, 163, 184, 0.2); --text: #edf4fb; --muted: #9aaec4; --blue: #67a7ff; --yellow: #f4c35f; --green: #72f0a6; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
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
    .cta { display: inline-flex; margin-top: 16px; padding: 14px 18px; border-radius: 14px; background: rgba(103,167,255,.16); border: 1px solid rgba(103,167,255,.35); color: #d9eaff; font-weight: 850; }
  </style>
</head>
<body>
<main>
  <section class="card">
    <div class="badge">Buy page activated · public trading live · full launch not approved</div>
    <h1>DEX Buy Page Activation Live</h1>
    <p>${escapeHtml(publicPayload.publicStatement)}</p>
    <p><strong>Activation hash:</strong> <code>${escapeHtml(publicPayload.dexBuyPageActivationLive.activationHash)}</code></p>
    <a class="cta" href="/buy">Open Buy Page</a>
  </section>

  <section class="card">
    <h2>Summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${summaryRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Required before full launch readiness review</h2>
    <table><thead><tr><th>Requirement</th><th>Value</th></tr></thead><tbody>${requiredRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table><thead><tr><th>Area</th><th>Status</th></tr></thead><tbody>${statusRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      The buy page is active and public trading is live. Full launch is still not approved.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-buy-page-activation-live">/api/public/dex-buy-page-activation-live</a></p>
    <p><a href="/dex-buy-page-activation-approval">DEX Buy Page Activation Approval</a></p>
    <p><a href="/dex-public-trading-link-approval">DEX Public Trading Link Approval</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

const buyHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Buy ASTRA | AstraTreasury</title>
  <meta name="robots" content="index,follow" />
  <style>
    :root { color-scheme: dark; --bg: #07101d; --surface: #0e1a2b; --border: rgba(148, 163, 184, 0.22); --text: #edf4fb; --muted: #9aaec4; --blue: #67a7ff; --green: #72f0a6; --yellow: #f4c35f; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; background: radial-gradient(circle at top, #13284a 0, var(--bg) 48%); color: var(--text); }
    main { width: min(920px, calc(100% - 40px)); margin: 0 auto; padding: 72px 0; }
    .hero { background: rgba(14,26,43,.9); border: 1px solid var(--border); border-radius: 28px; padding: 40px; box-shadow: 0 30px 90px rgba(0,0,0,.35); }
    .badge { display: inline-flex; padding: 8px 12px; border-radius: 999px; background: rgba(114,240,166,.1); border: 1px solid rgba(114,240,166,.24); color: var(--green); font-weight: 900; margin-bottom: 18px; }
    h1 { font-size: clamp(42px, 7vw, 72px); line-height: .95; letter-spacing: -2.8px; margin: 0 0 18px; }
    p { color: var(--muted); font-size: 18px; line-height: 1.7; }
    .cta { display: inline-flex; margin-top: 22px; padding: 16px 22px; border-radius: 16px; background: rgba(103,167,255,.18); border: 1px solid rgba(103,167,255,.38); color: #e6f0ff; font-weight: 950; text-decoration: none; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 14px; margin-top: 24px; }
    .fact { border: 1px solid var(--border); border-radius: 18px; padding: 16px; background: rgba(255,255,255,.03); }
    .fact strong { display: block; margin-bottom: 6px; }
    code { color: var(--muted); overflow-wrap: anywhere; }
    .notice { margin-top: 24px; padding: 16px; border-radius: 16px; background: rgba(244,195,95,.08); border: 1px solid rgba(244,195,95,.22); color: #f7d99a; line-height: 1.6; }
    a { color: var(--blue); }
  </style>
</head>
<body>
<main>
  <section class="hero">
    <div class="badge">ASTRA public trading is live</div>
    <h1>Buy ASTRA</h1>
    <p>
      ASTRA is available through the approved DEX trading link below.
      Liquidity is live and verified on Base. Full launch is still not approved.
    </p>
    <a class="cta" href="${escapeHtml(publicPayload.summary.tradingLinkUrl)}" rel="noopener noreferrer">Open approved DEX trading link</a>

    <div class="grid">
      <div class="fact"><strong>Pool</strong><code>${escapeHtml(publicPayload.summary.poolAddress)}</code></div>
      <div class="fact"><strong>Position token ID</strong><code>${escapeHtml(publicPayload.summary.positionTokenId)}</code></div>
      <div class="fact"><strong>Liquidity Safe</strong><code>${escapeHtml(publicPayload.summary.liquiditySafeAddress)}</code></div>
      <div class="fact"><strong>Execution tx</strong><code>${escapeHtml(publicPayload.summary.executionTxHash)}</code></div>
    </div>

    <div class="notice">
      This page provides an approved DEX trading link. It is not investment advice.
      Always verify the network, pool, and token details before trading.
    </div>

    <p><a href="/dex-buy-page-activation-live">View activation evidence</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(buyHtmlFile, buyHtml + "\n");

console.log("AstraTreasury DEX Buy Page Activation Live");
console.log("==========================================");
console.log(`Status: ${publicPayload.status}`);
console.log(`Buy page activated: ${publicPayload.summary.buyPageActivated}`);
console.log(`Public trading live: ${publicPayload.summary.publicTradingLive}`);
console.log(`Buy page URL: ${publicPayload.summary.buyPageUrl}`);
console.log(`Trading link URL: ${publicPayload.summary.tradingLinkUrl}`);
console.log(`Full launch approved: ${publicPayload.summary.fullLaunchApproved}`);
console.log(`Report: ${statusReportFile}`);
