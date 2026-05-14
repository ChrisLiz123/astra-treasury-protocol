import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const payloadRelativePath = "reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json";
const payloadPath = path.join(root, payloadRelativePath);
const resultRelativePath = "reports/dex-pool-creation-safe-payload-generation/dex-pool-creation-safe-payload-generation-result.json";

const reportDir = path.join(root, "reports", "dex-pool-creation-safe-payload-generation");
const reportFile = path.join(reportDir, "dex-pool-creation-safe-payload-generation-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-pool-creation-safe-payload-generation-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-pool-creation-safe-payload-generation.html");

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

const payload = readJson(payloadRelativePath, null);
const result = readJson(resultRelativePath, {});
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

const payloadPresent = Boolean(payload && payload.schema === "astra-dex-pool-creation-safe-payload-v0.1");
const status = payloadPresent
  ? "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATED_NOT_EXECUTED"
  : "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATION_READY_PENDING_GENERATION";

const artifactPaths = [
  payloadRelativePath,
  resultRelativePath,
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
  schema: "astra-dex-pool-creation-safe-payload-generation-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: payloadPresent
    ? "AstraTreasury generated a local DEX pool creation Safe payload for review. It has not been submitted to Safe, not executed, no pool is created, no liquidity is added, no funds are moved, and public trading is not approved."
    : "AstraTreasury Safe payload generation is ready, but no payload has been generated yet.",
  summary: {
    payloadPresent,
    payloadFile: payloadPresent ? payloadRelativePath : "",
    payloadHash: payloadPresent ? payload.payloadHash : "",
    safeAddress: payloadPresent ? payload.safeAddress : "",
    targetAddress: payloadPresent ? payload.transaction?.to : "",
    functionSelector: payloadPresent ? payload.transaction?.functionSelector : "",
    functionSignature: payloadPresent ? payload.transaction?.functionSignature : "",
    calldataBytes: payloadPresent ? (payload.transaction?.data?.length - 2) / 2 : 0,
    encodedCallDataGenerated: payloadPresent,
    safePayloadGenerated: payloadPresent,
    safeTransactionPrepared: false,
    safeTransactionSubmitted: false,
    safeTransactionExecuted: false,
    poolCreated: false,
    liquidityAdded: false,
    fundsMoved: false,
    publicTradingApproved: false,
    nextRecommendedMilestone: "DEX Pool Creation Safe Payload Verification Review"
  },
  safePayloadGeneration: {
    status,
    payloadHash: payloadPresent ? payload.payloadHash : "",
    resultHash: sha256Json(result),
    payloadSummary: payloadPresent ? {
      to: payload.transaction?.to,
      value: payload.transaction?.value,
      operation: payload.transaction?.operation,
      operationValue: payload.transaction?.operationValue,
      functionSelector: payload.transaction?.functionSelector,
      functionSignature: payload.transaction?.functionSignature,
      token0: payload.transaction?.parameters?.token0,
      token0Symbol: payload.transaction?.parameters?.token0Symbol,
      token1: payload.transaction?.parameters?.token1,
      token1Symbol: payload.transaction?.parameters?.token1Symbol,
      fee: payload.transaction?.parameters?.fee,
      sqrtPriceX96: payload.transaction?.parameters?.sqrtPriceX96
    } : {},
    artifactHashes
  },
  currentStatuses: {
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
    createsLiquidityPoolByThisScript: false,
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

const payloadRows = Object.entries(publicPayload.safePayloadGeneration.payloadSummary || {}).map(([key, value]) => {
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
  <title>AstraTreasury DEX Safe Payload Generation</title>
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
    <div class="badge">Safe payload generated · not submitted</div>
    <h1>DEX Safe Payload Generation</h1>
    <p>${escapeHtml(publicPayload.publicStatement)}</p>
    <p><strong>Payload hash:</strong> <code>${escapeHtml(publicPayload.summary.payloadHash)}</code></p>
  </section>

  <section class="card">
    <h2>Payload summary</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${payloadRows || '<tr><td colspan="2">No payload generated yet.</td></tr>'}</tbody>
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
      This generated local payload is not submitted to Safe and is not executed. No pool is created,
      no liquidity is added, no funds are moved, and public trading is not approved.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-pool-creation-safe-payload-generation">/api/public/dex-pool-creation-safe-payload-generation</a></p>
    <p><a href="/dex-pool-creation-safe-payload-generation-approval">DEX Safe Payload Generation Approval</a></p>
    <p><a href="/dex-pool-creation-safe-owners-threshold">DEX Safe Owners and Threshold Review</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Safe Payload Generation");
console.log("=========================================");
console.log(`Status: ${publicPayload.status}`);
console.log(`Payload present: ${payloadPresent}`);
console.log(`Payload hash: ${publicPayload.summary.payloadHash}`);
console.log(`Safe transaction submitted: ${publicPayload.summary.safeTransactionSubmitted}`);
console.log(`Pool created: ${publicPayload.summary.poolCreated}`);
console.log(`Report: ${reportFile}`);
