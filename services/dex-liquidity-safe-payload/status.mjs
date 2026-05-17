import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const safePayloadRelativePath = "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json";
const transactionBuilderRelativePath = "reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json";
const generationReportRelativePath = "reports/dex-liquidity-safe-payload/dex-liquidity-safe-payload-generation.json";

const reportDir = path.join(root, "reports", "dex-liquidity-safe-payload");
const statusReportFile = path.join(reportDir, "dex-liquidity-safe-payload-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-liquidity-safe-payload-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-liquidity-safe-payload.html");

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

const payload = readJson(safePayloadRelativePath, null);
const builder = readJson(transactionBuilderRelativePath, null);
const generated = Boolean(payload && payload.schema === "astra-dex-liquidity-safe-payload-v0.1");

const approvalStatus = readJson("public-docs/dex-liquidity-safe-payload-generation-approval-status.json");
const calldataVerificationStatus = readJson("public-docs/dex-liquidity-mint-calldata-verification-status.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const status = generated
  ? payload.status
  : "DEX_LIQUIDITY_SAFE_PAYLOAD_NOT_GENERATED";

const artifactPaths = [
  safePayloadRelativePath,
  transactionBuilderRelativePath,
  generationReportRelativePath,
  "public-docs/dex-liquidity-safe-payload-generation-approval-status.json",
  "reports/dex-liquidity-safe-payload-generation-approval/dex-liquidity-safe-payload-generation-approval-record.json",
  "public-docs/dex-liquidity-mint-calldata-verification-status.json",
  "reports/dex-liquidity-mint-calldata-verification/dex-liquidity-mint-calldata-verification.json",
  "reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
].filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths.map((artifactPath) => sha256File(artifactPath));

const tx = payload?.transactions?.[0] || {};

const publicPayload = {
  schema: "astra-dex-liquidity-safe-payload-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: generated
    ? "AstraTreasury generated the DEX liquidity Safe payload and Transaction Builder JSON. The payload has not been submitted or executed, liquidity has not been added, public trading is not approved, and full launch is not approved."
    : "AstraTreasury DEX liquidity Safe payload has not been generated.",
  summary: {
    generated,
    liquiditySafePayloadGenerated: generated,
    liquiditySafePayloadVerified: false,
    safeAddress: payload?.safeAddress || "",
    liquiditySafeAddress: payload?.liquiditySafeAddress || "",
    nonfungiblePositionManager: payload?.nonfungiblePositionManager || "",
    poolAddress: payload?.poolAddress || "",
    transactionCount: payload?.transactionCount || 0,
    safePayloadHash: payload?.safePayloadHash || "",
    transactionBuilderHash: payload?.transactionBuilderHash || "",
    calldataHash: payload?.calldataHash || "",
    transactionTo: tx.to || "",
    transactionValue: tx.value || "",
    transactionDataHash: tx.dataHash || "",
    liquiditySafeTransactionSubmitted: false,
    liquiditySafeTransactionExecuted: false,
    liquidityAdded: false,
    positionMinted: false,
    publicTradingApproved: false,
    fullLaunchApproved: false,
    nextRecommendedMilestone: "DEX Liquidity Safe Payload Verification",
    artifactCount: artifactHashes.length
  },
  liquiditySafePayload: {
    safePayloadReference: safePayloadRelativePath,
    transactionBuilderReference: transactionBuilderRelativePath,
    generationReportReference: generationReportRelativePath,
    safePayloadHash: payload?.safePayloadHash || "",
    transactionBuilderHash: builder?.transactionBuilderHash || "",
    hashAlgorithm: "SHA-256",
    transactions: payload?.transactions || [],
    mintParams: payload?.mintParams || {},
    readinessChecks: payload?.readinessChecks || {},
    requiredBeforeLiquiditySafePayloadVerification: {
      liquiditySafePayloadGenerated: generated,
      liquiditySafePayloadHashRecorded: Boolean(payload?.safePayloadHash),
      transactionBuilderHashRecorded: Boolean(builder?.transactionBuilderHash),
      mintCalldataHashRecorded: Boolean(payload?.calldataHash),
      liquiditySafeAddressRecorded: Boolean(payload?.liquiditySafeAddress),
      nonfungiblePositionManagerRecorded: Boolean(payload?.nonfungiblePositionManager),
      liquiditySafeTransactionSubmitted: false,
      liquiditySafeTransactionExecuted: false,
      liquidityAdded: false,
      publicStatusUpdatePrepared: false
    },
    artifactHashes
  },
  currentStatuses: {
    dexLiquiditySafePayloadGenerationApproval: approvalStatus.status || "UNKNOWN",
    dexLiquidityMintCalldataVerification: calldataVerificationStatus.status || "UNKNOWN",
    dexPoolPostExecutionVerification: poolStatus.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
  restrictions: {
    liquiditySafeSubmission: false,
    liquidityProvision: false,
    publicTrading: false,
    buyPageActivation: false,
    globalTreasuryFunding: false,
    fullLaunch: false
  },
  safety: {
    generatedSafePayloadOnly: true,
    submitsLiquiditySafeTransaction: false,
    executesLiquiditySafeTransaction: false,
    addsLiquidity: false,
    mintsPositionOnchain: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

writeJson(statusReportFile, publicPayload);
writeJson(publicJsonFile, publicPayload);

const summaryRows = Object.entries(publicPayload.summary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const txRows = (publicPayload.liquiditySafePayload.transactions || []).map((item) => {
  return `<tr>
    <td>${escapeHtml(item.id)}</td>
    <td><code>${escapeHtml(item.to)}</code></td>
    <td>${escapeHtml(item.value)}</td>
    <td>${escapeHtml(item.operation)}</td>
    <td><code>${escapeHtml(item.dataHash)}</code></td>
  </tr>`;
}).join("");

const requiredRows = Object.entries(publicPayload.liquiditySafePayload.requiredBeforeLiquiditySafePayloadVerification || {}).map(([key, value]) => {
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
  <title>AstraTreasury DEX Liquidity Safe Payload</title>
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
    <div class="badge">Safe payload generated · not submitted · no liquidity</div>
    <h1>DEX Liquidity Safe Payload</h1>
    <p>${escapeHtml(publicPayload.publicStatement)}</p>
    <p><strong>Safe payload hash:</strong> <code>${escapeHtml(publicPayload.summary.safePayloadHash)}</code></p>
  </section>

  <section class="card">
    <h2>Summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${summaryRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Transactions</h2>
    <table>
      <thead><tr><th>ID</th><th>To</th><th>Value</th><th>Operation</th><th>Data hash</th></tr></thead>
      <tbody>${txRows || '<tr><td colspan="5">No transactions.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Required before Safe payload verification</h2>
    <table><thead><tr><th>Requirement</th><th>Status</th></tr></thead><tbody>${requiredRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table><thead><tr><th>Area</th><th>Status</th></tr></thead><tbody>${statusRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This payload has not been submitted or executed. Liquidity has not been added,
      public trading is not approved, and full launch is not approved.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-liquidity-safe-payload">/api/public/dex-liquidity-safe-payload</a></p>
    <p><a href="/dex-liquidity-safe-payload-generation-approval">DEX Liquidity Safe Payload Generation Approval</a></p>
    <p><a href="/dex-liquidity-mint-calldata-verification">DEX Liquidity Mint Calldata Verification</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Liquidity Safe Payload");
console.log("========================================");
console.log(`Status: ${publicPayload.status}`);
console.log(`Safe payload generated: ${publicPayload.summary.liquiditySafePayloadGenerated}`);
console.log(`Safe payload hash: ${publicPayload.summary.safePayloadHash}`);
console.log(`Submitted: ${publicPayload.summary.liquiditySafeTransactionSubmitted}`);
console.log(`Executed: ${publicPayload.summary.liquiditySafeTransactionExecuted}`);
console.log(`Liquidity added: ${publicPayload.summary.liquidityAdded}`);
console.log(`Report: ${statusReportFile}`);
