import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const reviewRelativePath = "reports/dex-pool-creation-safe-payload-verification/dex-pool-creation-safe-payload-verification-review.json";
const reviewPath = path.join(root, reviewRelativePath);
const payloadRelativePath = "reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json";

const reportDir = path.join(root, "reports", "dex-pool-creation-safe-payload-verification");
const reportFile = path.join(reportDir, "dex-pool-creation-safe-payload-verification-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-pool-creation-safe-payload-verification-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-pool-creation-safe-payload-verification.html");

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

const review = readJson(reviewRelativePath, null);
const payload = readJson(payloadRelativePath, null);
const generationStatus = readJson("public-docs/dex-pool-creation-safe-payload-generation-status.json");
const approval = readJson("public-docs/dex-pool-creation-safe-payload-generation-approval-status.json");
const safeOwners = readJson("public-docs/dex-pool-creation-safe-owners-threshold-status.json");
const factoryRouter = readJson("public-docs/dex-pool-creation-factory-router-review-status.json");
const sqrtReview = readJson("public-docs/dex-pool-creation-token-ordering-sqrtprice-status.json");
const precheck = readJson("public-docs/dex-pool-existence-precheck-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const treasurySafeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const reviewPresent = Boolean(review && review.schema === "astra-dex-pool-creation-safe-payload-verification-review-v0.1");
const status = reviewPresent
  ? review.status
  : "DEX_POOL_CREATION_SAFE_PAYLOAD_VERIFICATION_REVIEW_NOT_RUN";

const artifactPaths = [
  reviewRelativePath,
  payloadRelativePath,
  "public-docs/dex-pool-creation-safe-payload-generation-status.json",
  "public-docs/dex-pool-creation-safe-payload-generation-approval-status.json",
  "public-docs/dex-pool-creation-safe-owners-threshold-status.json",
  "public-docs/dex-pool-creation-factory-router-review-status.json",
  "public-docs/dex-pool-creation-token-ordering-sqrtprice-status.json",
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

const publicPayload = {
  schema: "astra-dex-pool-creation-safe-payload-verification-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: status === "DEX_POOL_CREATION_SAFE_PAYLOAD_VERIFICATION_REVIEW_COMPLETE_NOT_EXECUTED"
    ? "AstraTreasury verified the generated local DEX pool creation Safe payload. It has not been submitted to Safe, not executed, no pool is created, no liquidity is added, no funds are moved, and public trading is not approved."
    : "AstraTreasury DEX pool creation Safe payload verification has not completed successfully.",
  summary: {
    reviewPresent,
    payloadHashVerified: review?.payloadHashVerified === true,
    selectorVerified: review?.verification?.selectorVerified === true,
    targetVerified: review?.verification?.targetVerified === true,
    safeAddressVerified: review?.verification?.safeAddressVerified === true,
    token0Verified: review?.verification?.token0Verified === true,
    token1Verified: review?.verification?.token1Verified === true,
    feeVerified: review?.verification?.feeVerified === true,
    sqrtPriceX96Verified: review?.verification?.sqrtPriceX96Verified === true,
    submittedToSafe: false,
    safeTransactionExecuted: false,
    poolCreated: false,
    liquidityAdded: false,
    fundsMoved: false,
    publicTradingApproved: false,
    nextRecommendedMilestone: "DEX Pool Creation Safe Submission Approval Package"
  },
  payloadVerification: {
    verificationHash: reviewPresent ? sha256Json(review) : "",
    payloadHash: review?.payloadHash || "",
    decodedCalldata: review?.decodedCalldata || {},
    verification: review?.verification || {},
    requiredBeforeSafeSubmission: review?.requiredBeforeSafeSubmission || {},
    artifactHashes
  },
  currentStatuses: {
    dexPoolCreationSafePayloadGeneration: generationStatus.status || "UNKNOWN",
    dexPoolCreationSafePayloadGenerationApproval: approval.status || "UNKNOWN",
    dexPoolCreationSafeOwnersThreshold: safeOwners.status || "UNKNOWN",
    dexPoolCreationFactoryRouterReview: factoryRouter.status || "UNKNOWN",
    dexPoolCreationSqrtPriceReview: sqrtReview.status || "UNKNOWN",
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
    safeTransactionSubmission: false,
    safeTransactionExecution: false,
    poolCreationExecution: false,
    liquidityProvision: false,
    publicTrading: false,
    buyPageActivation: false,
    realTreasuryFunding: false,
    fullLaunch: false
  },
  safety: {
    localFileOnly: true,
    submittedToSafe: false,
    sendsTransactions: false,
    movesFunds: false,
    createsLiquidityPoolByThisReview: false,
    addsLiquidity: false,
    enablesPublicTrading: false,
    preparesQueuedSafeTransaction: false,
    executesSafeTransaction: false,
    activatesBuyPage: false,
    approvesFullLaunch: false
  }
};

writeJson(reportFile, publicPayload);
writeJson(publicJsonFile, publicPayload);

const verifyRows = Object.entries(publicPayload.summary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const decodedRows = Object.entries(publicPayload.payloadVerification.decodedCalldata || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const requiredRows = Object.entries(publicPayload.payloadVerification.requiredBeforeSafeSubmission || {}).map(([key, value]) => {
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
  <title>AstraTreasury DEX Safe Payload Verification</title>
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
    <div class="badge">Payload verified · not submitted</div>
    <h1>DEX Safe Payload Verification</h1>
    <p>${escapeHtml(publicPayload.publicStatement)}</p>
    <p><strong>Verification hash:</strong> <code>${escapeHtml(publicPayload.payloadVerification.verificationHash)}</code></p>
    <p><strong>Payload hash:</strong> <code>${escapeHtml(publicPayload.payloadVerification.payloadHash)}</code></p>
  </section>

  <section class="card">
    <h2>Verification summary</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${verifyRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Decoded calldata</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${decodedRows || '<tr><td colspan="2">No decoded calldata available.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Required before Safe submission</h2>
    <table>
      <thead><tr><th>Requirement</th><th>Status</th></tr></thead>
      <tbody>${requiredRows}</tbody>
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
      This review verifies the local Safe payload only. It does not submit to Safe,
      execute a transaction, create a pool, add liquidity, move funds, or approve public trading.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-pool-creation-safe-payload-verification">/api/public/dex-pool-creation-safe-payload-verification</a></p>
    <p><a href="/dex-pool-creation-safe-payload-generation">DEX Safe Payload Generation</a></p>
    <p><a href="/dex-pool-creation-safe-payload-generation-approval">DEX Safe Payload Generation Approval</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Safe Payload Verification");
console.log("===========================================");
console.log(`Status: ${publicPayload.status}`);
console.log(`Payload hash verified: ${publicPayload.summary.payloadHashVerified}`);
console.log(`Safe submitted: ${publicPayload.summary.submittedToSafe}`);
console.log(`Safe executed: ${publicPayload.summary.safeTransactionExecuted}`);
console.log(`Pool created: ${publicPayload.summary.poolCreated}`);
console.log(`Report: ${reportFile}`);
