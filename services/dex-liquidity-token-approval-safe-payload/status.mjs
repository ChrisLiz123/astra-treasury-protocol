import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const payloadRelativePath = "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json";
const transactionBuilderRelativePath = "reports/dex-liquidity-token-approval/payload/token-approval-safe-transaction-builder.json";
const generationReportRelativePath = "reports/dex-liquidity-token-approval-safe-payload/dex-liquidity-token-approval-safe-payload-generation.json";

const reportDir = path.join(root, "reports", "dex-liquidity-token-approval-safe-payload");
const statusReportFile = path.join(reportDir, "dex-liquidity-token-approval-safe-payload-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-liquidity-token-approval-safe-payload-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-liquidity-token-approval-safe-payload.html");

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

const payload = readJson(payloadRelativePath, null);
const payloadPresent = Boolean(payload && payload.schema === "astra-dex-liquidity-token-approval-safe-payload-v0.1");

const generationReport = readJson(generationReportRelativePath);
const approvalStatus = readJson("public-docs/dex-liquidity-token-approval-payload-generation-approval-status.json");
const recheckStatus = readJson("public-docs/dex-liquidity-token-approval-requirements-recheck-status.json");
const postBalances = readJson("public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const status = payloadPresent
  ? payload.status
  : "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_NOT_GENERATED";

const artifactPaths = [
  payloadRelativePath,
  transactionBuilderRelativePath,
  generationReportRelativePath,
  "public-docs/dex-liquidity-token-approval-payload-generation-approval-status.json",
  "public-docs/dex-liquidity-token-approval-requirements-recheck-status.json",
  "public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
].filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths.map((artifactPath) => sha256File(artifactPath));

const transactionRows = (payload?.transactions || []).map((tx) => {
  return `<tr>
    <td>${escapeHtml(tx.role)}</td>
    <td>${escapeHtml(tx.symbol)}</td>
    <td><code>${escapeHtml(tx.tokenAddress)}</code></td>
    <td>${escapeHtml(tx.amountHuman || tx.amountRaw)}</td>
    <td><code>${escapeHtml(tx.approvalSpender)}</code></td>
    <td><code>${escapeHtml(tx.dataHash)}</code></td>
  </tr>`;
}).join("");

const publicPayload = {
  schema: "astra-dex-liquidity-token-approval-safe-payload-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: payloadPresent
    ? "AstraTreasury generated a local DEX liquidity token-approval Safe payload. The Safe transaction has not been submitted, no token approval has executed, no liquidity has been added, public trading is not approved, and full launch is not approved."
    : "AstraTreasury DEX liquidity token-approval Safe payload has not been generated successfully.",
  summary: {
    payloadPresent,
    tokenApprovalSafePayloadGenerated: payloadPresent,
    tokenApprovalTransactionBuilderGenerated: fs.existsSync(path.join(root, transactionBuilderRelativePath)),
    liquiditySafeAddress: payload?.liquiditySafeAddress || "",
    approvalSpender: payload?.approvalSpender || "",
    payloadHash: payload?.payloadHash || "",
    transactionBuilderHash: generationReport?.transactionBuilderHash || "",
    transactionCount: payload?.transactionCount || 0,
    tokenApprovalSafeTransactionSubmitted: false,
    tokenApprovalSafeTransactionExecuted: false,
    tokenApprovalExecuted: false,
    liquidityMintCalldataGenerated: false,
    liquiditySafePayloadGenerated: false,
    liquidityAdded: false,
    positionMinted: false,
    publicTradingApproved: false,
    fullLaunchApproved: false,
    nextRecommendedMilestone: "DEX Liquidity Token Approval Safe Payload Verification",
    artifactCount: artifactHashes.length
  },
  tokenApprovalSafePayload: {
    payloadHash: payload?.payloadHash || "",
    transactionBuilderHash: generationReport?.transactionBuilderHash || "",
    hashAlgorithm: "SHA-256",
    payloadReference: payloadRelativePath,
    transactionBuilderReference: transactionBuilderRelativePath,
    transactions: payload?.transactions || [],
    requiredBeforeTokenApprovalSafePayloadVerification: {
      tokenApprovalSafePayloadGenerated: payloadPresent,
      tokenApprovalPayloadHashRecorded: Boolean(payload?.payloadHash),
      transactionBuilderJsonGenerated: fs.existsSync(path.join(root, transactionBuilderRelativePath)),
      approvalSpenderRecorded: Boolean(payload?.approvalSpender),
      tokenApprovalExecuted: false,
      liquidityAdded: false,
      publicStatusUpdatePrepared: false
    },
    artifactHashes
  },
  currentStatuses: {
    dexTokenApprovalPayloadGenerationApproval: approvalStatus.status || "UNKNOWN",
    dexTokenApprovalRequirementsRecheck: recheckStatus.status || "UNKNOWN",
    dexFundingTransferPostExecutionBalances: postBalances.status || "UNKNOWN",
    dexPoolPostExecutionVerification: poolStatus.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
  restrictions: {
    tokenApprovalSubmission: false,
    tokenApprovalExecution: false,
    liquidityProvision: false,
    publicTrading: false,
    buyPageActivation: false,
    globalTreasuryFunding: false,
    fullLaunch: false
  },
  safety: {
    localPayloadOnly: true,
    submitsSafeTransaction: false,
    executesTokenApproval: false,
    generatesLiquidityCalldata: false,
    addsLiquidity: false,
    mintsPosition: false,
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

const requiredRows = Object.entries(publicPayload.tokenApprovalSafePayload.requiredBeforeTokenApprovalSafePayloadVerification).map(([key, value]) => {
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
  <title>AstraTreasury DEX Token Approval Safe Payload</title>
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
    <div class="badge">Token approval Safe payload · not submitted · no approvals executed</div>
    <h1>DEX Token Approval Safe Payload</h1>
    <p>${escapeHtml(publicPayload.publicStatement)}</p>
    <p><strong>Payload hash:</strong> <code>${escapeHtml(publicPayload.summary.payloadHash)}</code></p>
  </section>

  <section class="card">
    <h2>Summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${summaryRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Generated approval transactions</h2>
    <table>
      <thead><tr><th>Role</th><th>Symbol</th><th>Token</th><th>Amount</th><th>Spender</th><th>Data hash</th></tr></thead>
      <tbody>${transactionRows || '<tr><td colspan="6">No generated approval transactions.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Required before verification</h2>
    <table><thead><tr><th>Requirement</th><th>Status</th></tr></thead><tbody>${requiredRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table><thead><tr><th>Area</th><th>Status</th></tr></thead><tbody>${statusRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This is a local payload only. It has not been submitted, token approvals have not executed,
      liquidity has not been added, public trading is not approved, and full launch is not approved.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-liquidity-token-approval-safe-payload">/api/public/dex-liquidity-token-approval-safe-payload</a></p>
    <p><a href="/dex-liquidity-token-approval-payload-generation-approval">DEX Token Approval Payload Generation Approval</a></p>
    <p><a href="/dex-liquidity-token-approval-requirements-recheck">DEX Token Approval Requirements Recheck</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Token Approval Safe Payload");
console.log("=============================================");
console.log(`Status: ${publicPayload.status}`);
console.log(`Payload generated: ${publicPayload.summary.tokenApprovalSafePayloadGenerated}`);
console.log(`Transaction count: ${publicPayload.summary.transactionCount}`);
console.log(`Token approval submitted: ${publicPayload.summary.tokenApprovalSafeTransactionSubmitted}`);
console.log(`Token approval executed: ${publicPayload.summary.tokenApprovalExecuted}`);
console.log(`Liquidity added: ${publicPayload.summary.liquidityAdded}`);
console.log(`Report: ${statusReportFile}`);
