import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const recordRelativePath = "reports/dex-pool-creation-safe-submission-live/dex-pool-creation-safe-submission-live-record.json";
const recordPath = path.join(root, recordRelativePath);

const reportDir = path.join(root, "reports", "dex-pool-creation-safe-submission-live");
const reportFile = path.join(reportDir, "dex-pool-creation-safe-submission-live-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-pool-creation-safe-submission-live-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-pool-creation-safe-submission-live.html");

fs.mkdirSync(reportDir, { recursive: true });

const artifactPaths = [
  "configs/dex-pool-creation-safe-submission-live.config.json",
  "docs/dex-pool-creation-safe-submission-live/DEX_POOL_CREATION_SAFE_SUBMISSION_LIVE.md",
  "docs/dex-pool-creation-safe-submission-live/DEX_POOL_CREATION_SAFE_SUBMISSION_LIVE_CHECKLIST.md",
  "docs/dex-pool-creation-safe-submission-live/DEX_POOL_CREATION_SAFE_SUBMISSION_LIVE_BOUNDARIES.md",
  "docs/dex-pool-creation-safe-submission-live/DEX_POOL_CREATION_SAFE_SUBMISSION_LIVE_RUNBOOK.md",
  "scripts/record-dex-pool-creation-safe-submission-live.mjs",
  "public-docs/dex-pool-creation-safe-submission-execution-approval-status.json",
  "public-docs/dex-pool-creation-safe-submission-dry-run-status.json",
  "public-docs/dex-pool-creation-safe-submission-preparation-status.json",
  "public-docs/dex-pool-creation-safe-submission-approval-status.json",
  "public-docs/dex-pool-creation-safe-payload-verification-status.json",
  "public-docs/dex-pool-creation-safe-payload-generation-status.json",
  "public-docs/dex-pool-existence-precheck-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/mainnet-execution-status.json"
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

const record = readJsonPath(recordPath);
const liveRecordPresent = Boolean(record && record.schema === "astra-dex-pool-creation-safe-submission-live-record-v0.1");

const executionApproval = readJson("public-docs/dex-pool-creation-safe-submission-execution-approval-status.json");
const dryRun = readJson("public-docs/dex-pool-creation-safe-submission-dry-run-status.json");
const preparation = readJson("public-docs/dex-pool-creation-safe-submission-preparation-status.json");
const verification = readJson("public-docs/dex-pool-creation-safe-payload-verification-status.json");
const generation = readJson("public-docs/dex-pool-creation-safe-payload-generation-status.json");
const precheck = readJson("public-docs/dex-pool-existence-precheck-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const artifactHashes = artifactPaths
  .filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)))
  .map((artifactPath) => sha256File(artifactPath));

if (fs.existsSync(recordPath)) {
  artifactHashes.push(sha256File(recordRelativePath));
}

const status = liveRecordPresent
  ? "DEX_POOL_CREATION_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED"
  : "DEX_POOL_CREATION_SAFE_SUBMISSION_LIVE_READY_PENDING_SUBMISSION_EVIDENCE";

const payload = {
  schema: "astra-dex-pool-creation-safe-submission-live-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: liveRecordPresent
    ? "AstraTreasury recorded DEX pool creation Safe submission evidence. The Safe transaction is submitted/pending, not executed, no pool is created, no liquidity is added, no funds are moved, and public trading is not approved."
    : "AstraTreasury DEX pool creation Safe submission live framework is ready. Live submission evidence has not yet been recorded.",
  summary: {
    liveRecordPresent,
    safeTransactionSubmitted: liveRecordPresent,
    safeTransactionQueued: liveRecordPresent,
    safeTransactionPendingSignatures: liveRecordPresent,
    safeTransactionExecuted: false,
    poolCreated: false,
    liquidityAdded: false,
    fundsMoved: false,
    publicTradingApproved: false,
    safeTxHash: liveRecordPresent ? record.safeTxHash : "",
    safeNonce: liveRecordPresent ? record.safeNonce : "",
    safeTransactionUrl: liveRecordPresent ? record.safeTransactionUrl : "",
    nextRecommendedMilestone: "DEX Pool Creation Safe Pending Signature Monitoring",
    artifactCount: artifactHashes.length
  },
  safeSubmissionLive: {
    liveHash: liveRecordPresent ? sha256Json(record) : "",
    hashAlgorithm: "SHA-256",
    record: record || {},
    requiredBeforeSafeExecution: record?.requiredBeforeSafeExecution || {},
    artifactHashes
  },
  currentStatuses: {
    dexPoolCreationSafeSubmissionExecutionApproval: executionApproval.status || "UNKNOWN",
    dexPoolCreationSafeSubmissionDryRun: dryRun.status || "UNKNOWN",
    dexPoolCreationSafeSubmissionPreparation: preparation.status || "UNKNOWN",
    dexPoolCreationSafePayloadVerification: verification.status || "UNKNOWN",
    dexPoolCreationSafePayloadGeneration: generation.status || "UNKNOWN",
    dexPoolExistencePrecheck: precheck.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
  restrictions: {
    safeTransactionExecution: false,
    poolCreationExecution: false,
    liquidityProvision: false,
    publicTrading: false,
    buyPageActivation: false,
    realTreasuryFunding: false,
    fullLaunch: false
  },
  safety: {
    executesSafeTransaction: false,
    createsLiquidityPoolByThisRecord: false,
    addsLiquidity: false,
    movesFunds: false,
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

const recordRows = Object.entries(payload.safeSubmissionLive.record || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</td></tr>`;
}).join("");

const requiredRows = Object.entries(payload.safeSubmissionLive.requiredBeforeSafeExecution || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete" : "Required / pending"}</td></tr>`;
}).join("");

const statusRows = Object.entries(payload.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury DEX Safe Submission Live</title>
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
    <div class="badge">Safe submission live · not executed</div>
    <h1>DEX Safe Submission Live</h1>
    <p>${escapeHtml(payload.publicStatement)}</p>
    <p><strong>Live evidence hash:</strong> <code>${escapeHtml(payload.safeSubmissionLive.liveHash)}</code></p>
  </section>

  <section class="card">
    <h2>Summary</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${summaryRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Submission record</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${recordRows || '<tr><td colspan="2">No live submission record yet.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Required before Safe execution</h2>
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
      Safe submission evidence does not mean execution. This step does not execute the Safe transaction,
      create a pool, add liquidity, move funds, activate a buy page, or approve public trading.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-pool-creation-safe-submission-live">/api/public/dex-pool-creation-safe-submission-live</a></p>
    <p><a href="/dex-pool-creation-safe-submission-execution-approval">DEX Safe Submission Execution Approval</a></p>
    <p><a href="/dex-pool-creation-safe-submission-dry-run">DEX Safe Submission Dry Run</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Safe Submission Live");
console.log("======================================");
console.log(`Status: ${payload.status}`);
console.log(`Live record present: ${liveRecordPresent}`);
console.log(`Safe submitted: ${payload.summary.safeTransactionSubmitted}`);
console.log(`Safe executed: ${payload.summary.safeTransactionExecuted}`);
console.log(`Pool created: ${payload.summary.poolCreated}`);
console.log(`Report: ${reportFile}`);
