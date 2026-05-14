import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const sourceReviewPath = path.join(root, "reports", "dex-pool-creation-factory-router-review", "dex-pool-creation-factory-router-review.json");

const reportDir = path.join(root, "reports", "dex-pool-creation-factory-router-review");
const reportFile = path.join(reportDir, "dex-pool-creation-factory-router-review-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-pool-creation-factory-router-review-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-pool-creation-factory-router-review.html");

fs.mkdirSync(reportDir, { recursive: true });

function readJsonPath(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function readJson(relativePath, fallback = {}) {
  return readJsonPath(path.join(root, relativePath), fallback);
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
  return String(value || "UNKNOWN")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const review = readJsonPath(sourceReviewPath, {
  status: "DEX_POOL_CREATION_FACTORY_ROUTER_EXECUTION_PATH_REVIEW_NOT_RUN",
  intendedExecutionPath: {},
  selectedInputsForLaterPayloadGeneration: {},
  routeReview: {},
  rpcChecks: {},
  safety: {},
  issues: []
});

const sqrtReview = readJson("public-docs/dex-pool-creation-token-ordering-sqrtprice-status.json");
const draftReview = readJson("public-docs/dex-pool-creation-safe-payload-draft-review-status.json");
const draftStatus = readJson("public-docs/dex-pool-creation-safe-payload-draft-status.json");
const preparation = readJson("public-docs/dex-pool-creation-safe-payload-preparation-status.json");
const executionPrecheck = readJson("public-docs/dex-pool-creation-execution-precheck-status.json");
const poolCreationApproval = readJson("public-docs/dex-pool-creation-approval-status.json");
const precheck = readJson("public-docs/dex-pool-existence-precheck-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const treasurySafeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const artifactPaths = [
  "reports/dex-pool-creation-factory-router-review/dex-pool-creation-factory-router-review.json",
  "configs/dex-pool-creation-factory-router-review.config.json",
  "public-docs/dex-pool-creation-token-ordering-sqrtprice-status.json",
  "public-docs/dex-pool-creation-safe-payload-draft-review-status.json",
  "public-docs/dex-pool-creation-safe-payload-draft-status.json",
  "public-docs/dex-pool-creation-safe-payload-preparation-status.json",
  "public-docs/dex-pool-creation-execution-precheck-status.json",
  "public-docs/dex-pool-creation-approval-status.json",
  "public-docs/dex-pool-existence-precheck-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/treasury-safe-transaction-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-alerts-status.json",
  "public-docs/incident-summary.json",
  "public-docs/mainnet-execution-status.json"
].filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths.map((artifactPath) => sha256File(artifactPath));

const status = review.status || "DEX_POOL_CREATION_FACTORY_ROUTER_EXECUTION_PATH_REVIEW_NOT_RUN";

const publicStatement = status === "DEX_POOL_CREATION_FACTORY_ROUTER_EXECUTION_PATH_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED"
  ? "AstraTreasury completed the DEX pool creation factory/router execution path review. No encoded calldata is generated, no Safe payload is generated, no Safe transaction is prepared, no pool is created, no liquidity is added, no funds are moved, and public trading is not approved."
  : "AstraTreasury DEX pool creation factory/router execution path review has not completed successfully.";

const publicPayload = {
  schema: "astra-dex-pool-creation-factory-router-execution-path-public-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement,
  summary: {
    factoryRouterExecutionPathReviewed: status === "DEX_POOL_CREATION_FACTORY_ROUTER_EXECUTION_PATH_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED",
    targetAddress: review.intendedExecutionPath?.targetAddress || "",
    functionSignature: review.intendedExecutionPath?.functionSignature || "",
    factoryGetPoolFoundPool: Boolean(review.rpcChecks?.factoryGetPoolFoundPool),
    encodedCallDataGenerated: false,
    safePayloadGenerated: false,
    safeTransactionPrepared: false,
    poolCreated: false,
    liquidityAdded: false,
    publicTradingApproved: false,
    nextRecommendedMilestone: "DEX Pool Creation Safe Owners and Threshold Review",
    issueCount: Array.isArray(review.issues) ? review.issues.length : 0
  },
  factoryRouterReview: {
    reviewHash: sha256Json(review),
    hashAlgorithm: "SHA-256",
    intendedExecutionPath: review.intendedExecutionPath || {},
    selectedInputsForLaterPayloadGeneration: review.selectedInputsForLaterPayloadGeneration || {},
    routeReview: review.routeReview || {},
    rpcChecks: review.rpcChecks || {},
    requiredBeforeSafePayloadGeneration: review.requiredBeforeSafePayloadGeneration || {},
    hardStops: review.hardStops || {},
    safety: review.safety || {},
    artifactHashes
  },
  currentStatuses: {
    dexPoolCreationSqrtPriceReview: sqrtReview.status || "UNKNOWN",
    dexPoolCreationSafePayloadDraftReview: draftReview.status || "UNKNOWN",
    dexPoolCreationSafePayloadDraft: draftStatus.status || "UNKNOWN",
    dexPoolCreationSafePayloadPreparation: preparation.status || "UNKNOWN",
    dexPoolCreationExecutionPrecheck: executionPrecheck.status || "UNKNOWN",
    dexPoolCreationApproval: poolCreationApproval.status || "UNKNOWN",
    dexPoolExistencePrecheck: precheck.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    treasurySafeTransaction: treasurySafeTx.status || "UNKNOWN",
    monitor: monitor.status || "UNKNOWN",
    alerts: alerts.status || "UNKNOWN",
    incidents: incidents.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
  restrictions: {
    dexLiquidityPoolTrading: false,
    poolCreationExecution: false,
    liquidityProvision: false,
    publicTrading: false,
    buyPageActivation: false,
    realTreasuryFunding: false,
    mainnetExecutionQueue: false,
    safeTransactionPayloadGeneration: false,
    safeTransactionExecution: false
  },
  safety: {
    sendsTransactions: false,
    movesFunds: false,
    createsLiquidityPool: false,
    addsLiquidity: false,
    enablesPublicTrading: false,
    generatesEncodedCallData: false,
    generatesSafePayload: false,
    preparesSafeTransaction: false,
    submitsDirectExecution: false,
    activatesBuyPage: false,
    approvesFullLaunch: false
  }
};

writeJson(reportFile, publicPayload);
writeJson(publicJsonFile, publicPayload);

const targetRows = Object.entries(publicPayload.factoryRouterReview.intendedExecutionPath || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const inputRows = Object.entries(publicPayload.factoryRouterReview.selectedInputsForLaterPayloadGeneration || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const routeRows = Object.entries(publicPayload.factoryRouterReview.routeReview || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const rpcRows = Object.entries(publicPayload.factoryRouterReview.rpcChecks || {}).map(([key, value]) => {
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
  <title>AstraTreasury DEX Factory/Router Execution Path Review</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #08111f;
      --surface: #0e1a2b;
      --border: rgba(148, 163, 184, 0.2);
      --text: #edf4fb;
      --muted: #9aaec4;
      --blue: #67a7ff;
      --yellow: #f4c35f;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    body { margin: 0; background: linear-gradient(180deg, #07101d, var(--bg)); color: var(--text); }
    a { color: var(--blue); text-decoration: none; }

    main {
      width: min(1120px, calc(100% - 40px));
      margin: 0 auto;
      padding: 44px 0 72px;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 28px;
      box-shadow: 0 22px 70px rgba(0,0,0,.28);
      margin-bottom: 18px;
    }

    h1 { margin: 0 0 10px; font-size: 42px; letter-spacing: -1.2px; }
    h2 { margin: 0 0 14px; font-size: 24px; }
    p { color: var(--muted); line-height: 1.65; }

    .badge {
      display: inline-flex;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(244,195,95,.08);
      border: 1px solid rgba(244,195,95,.22);
      color: var(--yellow);
      font-weight: 850;
      margin-bottom: 16px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--border);
      border-radius: 18px;
      overflow: hidden;
      margin-bottom: 16px;
    }

    th, td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
    }

    th {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .08em;
      background: rgba(255,255,255,.03);
    }

    tr:last-child td { border-bottom: 0; }

    code {
      color: var(--muted);
      overflow-wrap: anywhere;
      font-size: 12px;
    }

    .notice {
      padding: 16px;
      border-radius: 16px;
      background: rgba(244,195,95,.08);
      border: 1px solid rgba(244,195,95,.22);
      color: #f7d99a;
      line-height: 1.6;
    }
  </style>
</head>
<body>
<main>
  <section class="card">
    <div class="badge">Factory/router review · no payload</div>
    <h1>DEX Factory/Router Execution Path Review</h1>
    <p>${escapeHtml(publicPayload.publicStatement)}</p>
    <p><strong>Review hash:</strong> <code>${escapeHtml(publicPayload.factoryRouterReview.reviewHash)}</code></p>
  </section>

  <section class="card">
    <h2>Intended execution target</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${targetRows || '<tr><td colspan="2">No target review available.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Selected inputs for later payload generation</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${inputRows || '<tr><td colspan="2">No input review available.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Route review</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${routeRows || '<tr><td colspan="2">No route review available.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>RPC checks</h2>
    <table>
      <thead><tr><th>Check</th><th>Value</th></tr></thead>
      <tbody>${rpcRows || '<tr><td colspan="2">No RPC checks available.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table>
      <thead><tr><th>Area</th><th>Status</th></tr></thead>
      <tbody>${statusRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This review confirms the target and path only. It does not generate calldata,
      generate a Safe payload, prepare a Safe transaction, create a pool, add liquidity,
      move funds, activate a buy page, or approve public trading.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-pool-creation-factory-router-review">/api/public/dex-pool-creation-factory-router-review</a></p>
    <p><a href="/dex-pool-creation-token-ordering-sqrtprice">DEX Token Ordering and sqrtPriceX96 Review</a></p>
    <p><a href="/dex-pool-creation-safe-payload-draft-review">DEX Safe Payload Draft Review</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Factory/Router Execution Path Review");
console.log("======================================================");
console.log(`Status: ${publicPayload.status}`);
console.log(`Target: ${publicPayload.summary.targetAddress}`);
console.log(`Factory getPool found pool: ${publicPayload.summary.factoryGetPoolFoundPool}`);
console.log(`Encoded calldata generated: ${publicPayload.summary.encodedCallDataGenerated}`);
console.log(`Safe payload generated: ${publicPayload.summary.safePayloadGenerated}`);
console.log(`Pool created: ${publicPayload.summary.poolCreated}`);
console.log(`Report: ${reportFile}`);
