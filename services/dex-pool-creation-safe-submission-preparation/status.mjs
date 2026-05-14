import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const prepRelativePath = "reports/dex-pool-creation-safe-submission-preparation/dex-pool-creation-safe-submission-preparation.json";
const prepPath = path.join(root, prepRelativePath);

const reportDir = path.join(root, "reports", "dex-pool-creation-safe-submission-preparation");
const reportFile = path.join(reportDir, "dex-pool-creation-safe-submission-preparation-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-pool-creation-safe-submission-preparation-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-pool-creation-safe-submission-preparation.html");

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

const prep = readJson(prepRelativePath, null);
const prepPresent = Boolean(prep && prep.schema === "astra-dex-pool-creation-safe-submission-preparation-v0.1");

const submissionApproval = readJson("public-docs/dex-pool-creation-safe-submission-approval-status.json");
const verification = readJson("public-docs/dex-pool-creation-safe-payload-verification-status.json");
const generation = readJson("public-docs/dex-pool-creation-safe-payload-generation-status.json");
const precheck = readJson("public-docs/dex-pool-existence-precheck-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const status = prepPresent
  ? prep.status
  : "DEX_POOL_CREATION_SAFE_SUBMISSION_PREPARATION_NOT_RUN";

const artifactPaths = [
  prepRelativePath,
  "reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json",
  "public-docs/dex-pool-creation-safe-submission-approval-status.json",
  "public-docs/dex-pool-creation-safe-payload-verification-status.json",
  "public-docs/dex-pool-creation-safe-payload-generation-status.json",
  "public-docs/dex-pool-existence-precheck-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/mainnet-execution-status.json"
].filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths.map((artifactPath) => sha256File(artifactPath));

const report = {
  schema: "astra-dex-pool-creation-safe-submission-preparation-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: status === "DEX_POOL_CREATION_SAFE_SUBMISSION_PREPARATION_READY_NOT_SUBMITTED"
    ? "AstraTreasury prepared the verified DEX pool creation Safe payload for a later submission step. The payload has not been submitted to Safe, not queued, not executed, no pool is created, no liquidity is added, no funds are moved, and public trading is not approved."
    : "AstraTreasury DEX pool creation Safe submission preparation has not completed successfully.",
  summary: {
    preparationReady: status === "DEX_POOL_CREATION_SAFE_SUBMISSION_PREPARATION_READY_NOT_SUBMITTED",
    payloadHash: prep?.payloadHash || "",
    safeAddress: prep?.safeSubmissionCandidate?.safeAddress || "",
    targetAddress: prep?.safeSubmissionCandidate?.to || "",
    functionSelector: prep?.safeSubmissionCandidate?.functionSelector || "",
    safeTransactionSubmitted: false,
    safeTransactionQueued: false,
    safeTransactionExecuted: false,
    poolCreated: false,
    liquidityAdded: false,
    fundsMoved: false,
    publicTradingApproved: false,
    nextRecommendedMilestone: "DEX Pool Creation Safe Submission Dry Run and Operator Command Review",
    artifactCount: artifactHashes.length
  },
  safeSubmissionPreparation: {
    preparationHash: prep?.preparationHash || "",
    hashAlgorithm: "SHA-256",
    candidate: prep?.safeSubmissionCandidate || {},
    operatorChecklist: prep?.operatorChecklist || [],
    requiredBeforeActualSafeSubmission: prep?.requiredBeforeActualSafeSubmission || {},
    artifactHashes
  },
  currentStatuses: {
    dexPoolCreationSafeSubmissionApproval: submissionApproval.status || "UNKNOWN",
    dexPoolCreationSafePayloadVerification: verification.status || "UNKNOWN",
    dexPoolCreationSafePayloadGeneration: generation.status || "UNKNOWN",
    dexPoolExistencePrecheck: precheck.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
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
    callsSafeTransactionService: false,
    opensSafeUi: false,
    submitsToSafe: false,
    requestsSignatures: false,
    queuesSafeTransaction: false,
    executesSafeTransaction: false,
    createsPool: false,
    addsLiquidity: false,
    movesFunds: false,
    activatesBuyPage: false,
    approvesFullLaunch: false
  }
};

writeJson(reportFile, report);
writeJson(publicJsonFile, report);

const summaryRows = Object.entries(report.summary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const candidateRows = Object.entries(report.safeSubmissionPreparation.candidate).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</td></tr>`;
}).join("");

const requiredRows = Object.entries(report.safeSubmissionPreparation.requiredBeforeActualSafeSubmission).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete" : "Required / pending"}</td></tr>`;
}).join("");

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury DEX Safe Submission Preparation</title>
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
    <div class="badge">Safe submission preparation · not submitted</div>
    <h1>DEX Safe Submission Preparation</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
    <p><strong>Preparation hash:</strong> <code>${escapeHtml(report.safeSubmissionPreparation.preparationHash)}</code></p>
  </section>

  <section class="card">
    <h2>Summary</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${summaryRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Safe submission candidate</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${candidateRows || '<tr><td colspan="2">No candidate prepared.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Required before actual Safe submission</h2>
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
      This page prepares a later Safe submission step only. It does not call the Safe Transaction Service,
      open the Safe UI, submit the transaction, request signatures, execute the transaction, create a pool,
      add liquidity, move funds, or approve public trading.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-pool-creation-safe-submission-preparation">/api/public/dex-pool-creation-safe-submission-preparation</a></p>
    <p><a href="/dex-pool-creation-safe-submission-approval">DEX Safe Submission Approval</a></p>
    <p><a href="/dex-pool-creation-safe-payload-verification">DEX Safe Payload Verification</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Safe Submission Preparation");
console.log("=============================================");
console.log(`Status: ${report.status}`);
console.log(`Preparation ready: ${report.summary.preparationReady}`);
console.log(`Safe submitted: ${report.summary.safeTransactionSubmitted}`);
console.log(`Safe executed: ${report.summary.safeTransactionExecuted}`);
console.log(`Pool created: ${report.summary.poolCreated}`);
console.log(`Report: ${reportFile}`);
