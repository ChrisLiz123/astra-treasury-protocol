import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const recordRelativePath = "reports/dex-pool-creation-safe-submission-approval/dex-pool-creation-safe-submission-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const reportDir = path.join(root, "reports", "dex-pool-creation-safe-submission-approval");
const reportFile = path.join(reportDir, "dex-pool-creation-safe-submission-approval-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-pool-creation-safe-submission-approval-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-pool-creation-safe-submission-approval.html");

fs.mkdirSync(reportDir, { recursive: true });

const artifactPaths = [
  "configs/dex-pool-creation-safe-submission-approval.config.json",
  "docs/dex-pool-creation-safe-submission-approval/DEX_POOL_CREATION_SAFE_SUBMISSION_APPROVAL.md",
  "docs/dex-pool-creation-safe-submission-approval/DEX_POOL_CREATION_SAFE_SUBMISSION_APPROVAL_CHECKLIST.md",
  "docs/dex-pool-creation-safe-submission-approval/DEX_POOL_CREATION_SAFE_SUBMISSION_BOUNDARIES.md",
  "docs/dex-pool-creation-safe-submission-approval/DEX_POOL_CREATION_SAFE_SUBMISSION_APPROVAL_RUNBOOK.md",
  "scripts/record-dex-pool-creation-safe-submission-approval.mjs",
  "reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json",
  "public-docs/dex-pool-creation-safe-payload-verification-status.json",
  "public-docs/dex-pool-creation-safe-payload-generation-status.json",
  "public-docs/dex-pool-creation-safe-payload-generation-approval-status.json",
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

const config = readJson("configs/dex-pool-creation-safe-submission-approval.config.json");
const record = readJsonPath(recordPath);
const approvalRecordPresent = Boolean(record && record.schema === "astra-dex-pool-creation-safe-submission-approval-record-v0.1");

const verification = readJson("public-docs/dex-pool-creation-safe-payload-verification-status.json");
const generation = readJson("public-docs/dex-pool-creation-safe-payload-generation-status.json");
const generationApproval = readJson("public-docs/dex-pool-creation-safe-payload-generation-approval-status.json");
const precheck = readJson("public-docs/dex-pool-existence-precheck-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const execution = readJson("public-docs/mainnet-execution-status.json");
const payload = readJson("reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json");

const checks = [];

function check(name, pass, details = {}) {
  checks.push({ name, pass: Boolean(pass), details });
}

check("Framework prepared", config.approvalPrepared === true && config.approvalOnly === true, {
  approvalPrepared: config.approvalPrepared,
  approvalOnly: config.approvalOnly
});

check("Payload verification complete", verification.status === "DEX_POOL_CREATION_SAFE_PAYLOAD_VERIFICATION_REVIEW_COMPLETE_NOT_EXECUTED", {
  status: verification.status || "UNKNOWN"
});

check("Payload generated but not executed", generation.status === "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATED_NOT_EXECUTED", {
  status: generation.status || "UNKNOWN"
});

check("Payload generation approval recorded", generationApproval.status === "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_GENERATED", {
  status: generationApproval.status || "UNKNOWN"
});

check("Fresh no-pool recheck complete", precheck.status === "DEX_POOL_EXISTENCE_FACTORY_PRECHECK_COMPLETE_NO_POOL_FOUND" && precheck.summary?.poolExists === false, {
  status: precheck.status || "UNKNOWN",
  poolExists: precheck.summary?.poolExists
});

check("Payload not submitted or executed", payload.flags?.safeTransactionSubmitted === false && payload.flags?.safeTransactionExecuted === false, {
  safeTransactionSubmitted: payload.flags?.safeTransactionSubmitted,
  safeTransactionExecuted: payload.flags?.safeTransactionExecuted
});

check("Pool/liquidity/funds unchanged", payload.flags?.poolCreated === false && payload.flags?.liquidityAdded === false && payload.flags?.fundsMoved === false, {
  poolCreated: payload.flags?.poolCreated,
  liquidityAdded: payload.flags?.liquidityAdded,
  fundsMoved: payload.flags?.fundsMoved
});

check("Full launch not approved", fullLaunch.fullLaunchApproved === false, {
  fullLaunchApproved: fullLaunch.fullLaunchApproved
});

check("Treasury funding not approved/executed", treasuryFunding.treasuryFundingApproved === false && treasuryFunding.treasuryFundingExecuted === false, {
  treasuryFundingApproved: treasuryFunding.treasuryFundingApproved,
  treasuryFundingExecuted: treasuryFunding.treasuryFundingExecuted
});

check("Execution queue disabled", execution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: execution.mode || "UNKNOWN"
});

check("Approval record matches config", config.safeSubmissionApprovalRecorded === approvalRecordPresent && config.safeSubmissionApproved === approvalRecordPresent, {
  approvalRecordPresent,
  configSafeSubmissionApprovalRecorded: config.safeSubmissionApprovalRecorded,
  configSafeSubmissionApproved: config.safeSubmissionApproved
});

const forbiddenFiles = [
  "reports/dex-pool-creation-safe-submission/submitted/safe-submission-record.json",
  "reports/dex-pool-creation-safe-submission/queued/safe-queued-record.json",
  "reports/dex-pool-creation-safe-execution/executed/safe-execution-record.json",
  "reports/dex-pool-creation/live/dex-pool-created.json",
  "reports/dex-pool-creation/live/pool-created.json",
  "reports/dex-pool-creation/direct/direct-execution-submitted.json",
  "public-docs/dex-pool-created-status.json"
];

const forbiddenArtifactsPresent = forbiddenFiles.filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

check("No forbidden submission/execution artifacts present", forbiddenArtifactsPresent.length === 0, {
  forbiddenArtifactsPresent
});

const missingArtifacts = artifactPaths.filter((artifactPath) => {
  return !fs.existsSync(path.join(root, artifactPath));
});

for (const artifactPath of missingArtifacts) {
  check(`Submission approval artifact exists: ${artifactPath}`, false, { artifactPath });
}

const artifactHashes = artifactPaths
  .filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)))
  .map((artifactPath) => sha256File(artifactPath));

if (fs.existsSync(recordPath)) {
  artifactHashes.push(sha256File(recordRelativePath));
}

const approvalPayload = {
  schema: "astra-dex-pool-creation-safe-submission-approval-payload-v0.1",
  currentApprovedMode: "restricted-mainnet-operation",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  approvalRecordPresent,
  safeSubmissionApproved: approvalRecordPresent,
  safeTransactionSubmitted: false,
  safeTransactionExecuted: false,
  poolCreated: false,
  liquidityAdded: false,
  fundsMoved: false,
  artifactHashes
};

const approvalHash = sha256Json(approvalPayload);
const failures = checks.filter((item) => !item.pass);

const status = failures.length > 0
  ? "DEX_POOL_CREATION_SAFE_SUBMISSION_APPROVAL_REVIEW_REQUIRED"
  : approvalRecordPresent
    ? "DEX_POOL_CREATION_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED"
    : "DEX_POOL_CREATION_SAFE_SUBMISSION_APPROVAL_READY_PENDING_APPROVAL";

const approvalSummary = approvalRecordPresent
  ? {
      recordedAt: record.recordedAt,
      approver: record.approver,
      approvalReference: record.approvalReference,
      payloadHash: record.payloadHash,
      safeAddress: record.safeAddress,
      targetAddress: record.targetAddress,
      functionSignature: record.functionSignature,
      safeSubmissionApproved: true,
      safeTransactionSubmitted: false,
      safeTransactionExecuted: false,
      poolCreated: false,
      liquidityAdded: false,
      fundsMoved: false,
      publicTradingApproved: false,
      fullLaunchApproved: false
    }
  : {
      recordedAt: "",
      approver: "not recorded",
      approvalReference: "not recorded",
      payloadHash: payload.payloadHash || "",
      safeAddress: payload.safeAddress || "",
      targetAddress: payload.transaction?.to || "",
      functionSignature: payload.transaction?.functionSignature || "",
      safeSubmissionApproved: false,
      safeTransactionSubmitted: false,
      safeTransactionExecuted: false,
      poolCreated: false,
      liquidityAdded: false,
      fundsMoved: false,
      publicTradingApproved: false,
      fullLaunchApproved: false
    };

const report = {
  schema: "astra-dex-pool-creation-safe-submission-approval-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: approvalRecordPresent
    ? "AstraTreasury DEX pool creation Safe submission is approved for a later submission step only. The payload has not been submitted to Safe, not executed, no pool is created, no liquidity is added, no funds are moved, and public trading is not approved."
    : "AstraTreasury DEX pool creation Safe submission approval framework is ready. Approval has not yet been recorded.",
  summary: {
    approvalRecordPresent,
    safeSubmissionApproved: approvalRecordPresent,
    safeTransactionSubmitted: false,
    safeTransactionExecuted: false,
    poolCreated: false,
    liquidityAdded: false,
    fundsMoved: false,
    publicTradingApproved: false,
    nextRecommendedMilestone: "DEX Pool Creation Safe Submission Preparation",
    artifactCount: artifactHashes.length,
    missingArtifactCount: missingArtifacts.length,
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length
  },
  safeSubmissionApproval: {
    approvalHash,
    hashAlgorithm: "SHA-256",
    approvalSummary,
    requiredBeforeActualSafeSubmission: config.requiredBeforeActualSafeSubmission || {},
    hardStops: config.hardStops || {},
    artifactHashes
  },
  checks,
  failures,
  missingArtifacts,
  currentStatuses: {
    dexPoolCreationSafePayloadVerification: verification.status || "UNKNOWN",
    dexPoolCreationSafePayloadGeneration: generation.status || "UNKNOWN",
    dexPoolCreationSafePayloadGenerationApproval: generationApproval.status || "UNKNOWN",
    dexPoolExistencePrecheck: precheck.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
  restrictions: {
    safeTransactionSubmission: !approvalRecordPresent,
    safeTransactionExecution: false,
    poolCreationExecution: false,
    liquidityProvision: false,
    publicTrading: false,
    buyPageActivation: false,
    realTreasuryFunding: false,
    fullLaunch: false
  },
  safety: {
    sendsTransactions: false,
    submitsToSafe: false,
    queuesSafeTransaction: false,
    executesSafeTransaction: false,
    createsLiquidityPool: false,
    addsLiquidity: false,
    movesFunds: false,
    activatesBuyPage: false,
    approvesFullLaunch: false
  }
};

writeJson(reportFile, report);
writeJson(publicJsonFile, report);

const approvalRows = Object.entries(approvalSummary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const requiredRows = Object.entries(report.safeSubmissionApproval.requiredBeforeActualSafeSubmission).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete" : "Required / pending"}</td></tr>`;
}).join("");

const checkRows = checks.map((item) => {
  return `<tr><td>${escapeHtml(item.name)}</td><td>${item.pass ? "PASS" : "FAIL"}</td><td><code>${escapeHtml(JSON.stringify(item.details))}</code></td></tr>`;
}).join("");

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury DEX Safe Submission Approval</title>
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
    <div class="badge">Safe submission approval · not submitted</div>
    <h1>DEX Safe Submission Approval</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
    <p><strong>Approval hash:</strong> <code>${escapeHtml(approvalHash)}</code></p>
  </section>

  <section class="card">
    <h2>Approval summary</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${approvalRows}</tbody>
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
    <h2>Checks</h2>
    <table>
      <thead><tr><th>Check</th><th>Status</th><th>Details</th></tr></thead>
      <tbody>${checkRows}</tbody>
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
      This page records approval for a later Safe submission step only. It does not submit to Safe,
      execute a transaction, create a pool, add liquidity, move funds, activate a buy page, or approve public trading.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-pool-creation-safe-submission-approval">/api/public/dex-pool-creation-safe-submission-approval</a></p>
    <p><a href="/dex-pool-creation-safe-payload-verification">DEX Safe Payload Verification</a></p>
    <p><a href="/dex-pool-creation-safe-payload-generation">DEX Safe Payload Generation</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Safe Submission Approval");
console.log("==========================================");
console.log(`Status: ${report.status}`);
console.log(`Approval record present: ${approvalRecordPresent}`);
console.log(`Safe submission approved: ${report.summary.safeSubmissionApproved}`);
console.log(`Safe submitted: ${report.summary.safeTransactionSubmitted}`);
console.log(`Safe executed: ${report.summary.safeTransactionExecuted}`);
console.log(`Pool created: ${report.summary.poolCreated}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
