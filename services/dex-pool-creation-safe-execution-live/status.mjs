import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const recordRelativePath = "reports/dex-pool-creation-safe-execution-live/dex-pool-creation-safe-execution-live-record.json";
const poolRecordRelativePath = "reports/dex-pool-creation/live/dex-pool-created.json";

const reportDir = path.join(root, "reports", "dex-pool-creation-safe-execution-live");
const reportFile = path.join(reportDir, "dex-pool-creation-safe-execution-live-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-pool-creation-safe-execution-live-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-pool-creation-safe-execution-live.html");

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

const record = readJson(recordRelativePath, null);
const poolRecord = readJson(poolRecordRelativePath, null);
const recordPresent = Boolean(record && record.schema === "astra-dex-pool-creation-safe-execution-live-record-v0.1");

const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const status = recordPresent
  ? "DEX_POOL_CREATION_SAFE_EXECUTION_LIVE_RECORDED_POOL_CREATED_NO_LIQUIDITY"
  : "DEX_POOL_CREATION_SAFE_EXECUTION_LIVE_READY_PENDING_EXECUTION_EVIDENCE";

const artifactPaths = [
  recordRelativePath,
  poolRecordRelativePath,
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/mainnet-execution-status.json"
].filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths.map((artifactPath) => sha256File(artifactPath));

const payload = {
  schema: "astra-dex-pool-creation-safe-execution-live-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: recordPresent
    ? "AstraTreasury recorded Safe execution evidence for DEX pool creation. The pool is created, no liquidity is added, no treasury funds are moved, public trading is not approved, and full launch is not approved."
    : "AstraTreasury DEX pool creation Safe execution live framework is ready. Execution evidence has not yet been recorded.",
  summary: {
    executionRecordPresent: recordPresent,
    safeTransactionExecuted: recordPresent,
    poolCreated: recordPresent,
    poolAddress: record?.poolAddress || "",
    executionTxHash: record?.executionTxHash || "",
    safeTxHash: record?.safeTxHash || "",
    liquidityAdded: false,
    fundsMoved: false,
    publicTradingApproved: false,
    buyPageActivated: false,
    fullLaunchApproved: false,
    nextRecommendedMilestone: "DEX Pool Creation Post-Execution Pool Verification and Monitoring",
    artifactCount: artifactHashes.length
  },
  safeExecutionLive: {
    liveHash: recordPresent ? sha256Json(record) : "",
    hashAlgorithm: "SHA-256",
    record: record || {},
    poolRecord: poolRecord || {},
    requiredAfterSafeExecution: {
      safeExecutionLiveRecorded: recordPresent,
      executionTransactionHashRecorded: recordPresent,
      poolAddressVerified: record?.poolAddressVerified === true,
      postExecutionMonitoringComplete: false,
      liquidityProvisionApprovalRecorded: false,
      publicStatusUpdatePrepared: false
    },
    artifactHashes
  },
  currentStatuses: {
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
  restrictions: {
    liquidityProvision: false,
    publicTrading: false,
    buyPageActivation: false,
    realTreasuryFunding: false,
    fullLaunch: false
  },
  safety: {
    addsLiquidity: false,
    movesTreasuryFunds: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

writeJson(reportFile, payload);
writeJson(publicJsonFile, payload);

const summaryRows = Object.entries(payload.summary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const recordRows = Object.entries(payload.safeExecutionLive.record || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</td></tr>`;
}).join("");

const statusRows = Object.entries(payload.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury DEX Safe Execution Live</title>
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
    <div class="badge">Safe execution live · pool created · no liquidity</div>
    <h1>DEX Safe Execution Live</h1>
    <p>${escapeHtml(payload.publicStatement)}</p>
    <p><strong>Live hash:</strong> <code>${escapeHtml(payload.safeExecutionLive.liveHash)}</code></p>
  </section>

  <section class="card">
    <h2>Summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${summaryRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Execution record</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${recordRows || '<tr><td colspan="2">No execution record yet.</td></tr>'}</tbody></table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table><thead><tr><th>Area</th><th>Status</th></tr></thead><tbody>${statusRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      Pool creation does not mean liquidity has been added or public trading is approved.
      Liquidity, buy page activation, and public trading require separate approvals.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-pool-creation-safe-execution-live">/api/public/dex-pool-creation-safe-execution-live</a></p>
    <p><a href="/dex-pool-creation-safe-execution-approval">DEX Safe Execution Approval</a></p>
    <p><a href="/dex-pool-creation-safe-pending-signatures">DEX Safe Pending Signatures</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Safe Execution Live");
console.log("=====================================");
console.log(`Status: ${payload.status}`);
console.log(`Pool created: ${payload.summary.poolCreated}`);
console.log(`Pool address: ${payload.summary.poolAddress}`);
console.log(`Liquidity added: ${payload.summary.liquidityAdded}`);
console.log(`Public trading approved: ${payload.summary.publicTradingApproved}`);
console.log(`Report: ${reportFile}`);
