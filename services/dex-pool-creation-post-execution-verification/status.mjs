import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const verificationRelativePath = "reports/dex-pool-creation-post-execution-verification/dex-pool-creation-post-execution-verification.json";

const reportDir = path.join(root, "reports", "dex-pool-creation-post-execution-verification");
const reportFile = path.join(reportDir, "dex-pool-creation-post-execution-verification-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-pool-creation-post-execution-verification-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-pool-creation-post-execution-verification.html");

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

const verification = readJson(verificationRelativePath, null);
const verificationPresent = Boolean(verification && verification.schema === "astra-dex-pool-creation-post-execution-verification-v0.1");

const executionLive = readJson("public-docs/dex-pool-creation-safe-execution-live-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const status = verificationPresent
  ? verification.status
  : "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFICATION_NOT_RUN";

const artifactPaths = [
  verificationRelativePath,
  "reports/dex-pool-creation-safe-execution-live/dex-pool-creation-safe-execution-live-record.json",
  "reports/dex-pool-creation/live/dex-pool-created.json",
  "public-docs/dex-pool-creation-safe-execution-live-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/mainnet-execution-status.json"
].filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths.map((artifactPath) => sha256File(artifactPath));

const payload = {
  schema: "astra-dex-pool-creation-post-execution-verification-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: status === "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING"
    ? "AstraTreasury verified the created DEX pool after Safe execution. The pool exists and is initialized, liquidity is zero, treasury funds have not moved, public trading is not approved, and full launch is not approved."
    : "AstraTreasury DEX pool post-execution verification has not completed successfully.",
  summary: {
    verificationPresent,
    poolVerified: status === "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING",
    poolAddress: verification?.poolVerification?.recordedPoolAddress || "",
    factoryGetPoolMatchesRecorded: verification?.poolVerification?.factoryGetPoolMatchesRecorded === true,
    poolCodePresent: verification?.poolVerification?.poolCodePresent === true,
    token0Verified: verification?.poolVerification?.token0Verified === true,
    token1Verified: verification?.poolVerification?.token1Verified === true,
    feeVerified: verification?.poolVerification?.feeVerified === true,
    slot0Initialized: verification?.poolVerification?.slot0Initialized === true,
    liquidityVerifiedZero: verification?.poolVerification?.liquidityVerifiedZero === true,
    poolLiquidity: verification?.poolVerification?.poolLiquidity || "",
    liquidityAdded: false,
    fundsMoved: false,
    publicTradingApproved: false,
    buyPageActivated: false,
    fullLaunchApproved: false,
    nextRecommendedMilestone: "DEX Liquidity Provision Approval Package",
    artifactCount: artifactHashes.length
  },
  postExecutionVerification: {
    verificationHash: verification?.verificationHash || "",
    hashAlgorithm: "SHA-256",
    poolVerification: verification?.poolVerification || {},
    executionEvidence: verification?.executionEvidence || {},
    requiredBeforeLiquidityProvisionApproval: verification?.requiredBeforeLiquidityProvisionApproval || {},
    artifactHashes
  },
  currentStatuses: {
    dexPoolCreationSafeExecutionLive: executionLive.status || "UNKNOWN",
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
    readOnlyRpcOnly: true,
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

const poolRows = Object.entries(payload.postExecutionVerification.poolVerification || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</td></tr>`;
}).join("");

const requiredRows = Object.entries(payload.postExecutionVerification.requiredBeforeLiquidityProvisionApproval || {}).map(([key, value]) => {
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
  <title>AstraTreasury DEX Post-Execution Pool Verification</title>
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
    <div class="badge">Post-execution verification · pool created · zero liquidity</div>
    <h1>DEX Post-Execution Pool Verification</h1>
    <p>${escapeHtml(payload.publicStatement)}</p>
    <p><strong>Verification hash:</strong> <code>${escapeHtml(payload.postExecutionVerification.verificationHash)}</code></p>
  </section>

  <section class="card">
    <h2>Summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${summaryRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Pool verification</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${poolRows || '<tr><td colspan="2">No pool verification available.</td></tr>'}</tbody></table>
  </section>

  <section class="card">
    <h2>Required before liquidity provision approval</h2>
    <table><thead><tr><th>Requirement</th><th>Status</th></tr></thead><tbody>${requiredRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table><thead><tr><th>Area</th><th>Status</th></tr></thead><tbody>${statusRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      The pool exists, but liquidity has not been added and public trading is not approved.
      Buying remains unavailable until liquidity, disclosure, buy page, and public trading approvals are completed.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-pool-creation-post-execution-verification">/api/public/dex-pool-creation-post-execution-verification</a></p>
    <p><a href="/dex-pool-creation-safe-execution-live">DEX Safe Execution Live</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Post-Execution Pool Verification");
console.log("==================================================");
console.log(`Status: ${payload.status}`);
console.log(`Pool verified: ${payload.summary.poolVerified}`);
console.log(`Pool address: ${payload.summary.poolAddress}`);
console.log(`Pool liquidity: ${payload.summary.poolLiquidity}`);
console.log(`Public trading approved: ${payload.summary.publicTradingApproved}`);
console.log(`Report: ${reportFile}`);
