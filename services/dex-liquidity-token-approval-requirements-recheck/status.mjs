import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const reportRelativePath = "reports/dex-liquidity-token-approval-requirements-recheck/dex-liquidity-token-approval-requirements-recheck.json";

const reportDir = path.join(root, "reports", "dex-liquidity-token-approval-requirements-recheck");
const statusReportFile = path.join(reportDir, "dex-liquidity-token-approval-requirements-recheck-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-liquidity-token-approval-requirements-recheck-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-liquidity-token-approval-requirements-recheck.html");

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

const report = readJson(reportRelativePath, null);
const reportPresent = Boolean(report && report.schema === "astra-dex-liquidity-token-approval-requirements-recheck-v0.1");

const postBalanceStatus = readJson("public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json");
const executionLiveStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-execution-live-status.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const status = reportPresent
  ? report.status
  : "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK_NOT_RUN";

const artifactPaths = [
  reportRelativePath,
  "public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json",
  "reports/dex-liquidity-funding-transfer-post-execution-balances/dex-liquidity-funding-transfer-post-execution-balances.json",
  "public-docs/dex-liquidity-funding-transfer-safe-execution-live-status.json",
  "reports/dex-liquidity-treasury-funding/live/funds-moved.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
].filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths.map((artifactPath) => sha256File(artifactPath));

const tokenRows = (report?.tokenApprovalRequirements || []).map((item) => {
  return `<tr>
    <td>${escapeHtml(item.role)}</td>
    <td>${escapeHtml(item.symbol)}</td>
    <td><code>${escapeHtml(item.tokenAddress)}</code></td>
    <td>${escapeHtml(item.desiredHuman || item.desiredRaw)}</td>
    <td>${escapeHtml(item.currentBalanceHuman || item.currentBalanceRaw)}</td>
    <td>${escapeHtml(item.currentAllowanceHuman || item.currentAllowanceRaw)}</td>
    <td>${escapeHtml(item.approvalRequired)}</td>
  </tr>`;
}).join("");

const nextRecommendedMilestone = report?.tokenApprovalsRequiredBeforeLiquidity === true
  ? "DEX Liquidity Token Approval Payload Generation Approval"
  : "DEX Liquidity Mint Calldata Generation Approval";

const publicPayload = {
  schema: "astra-dex-liquidity-token-approval-requirements-recheck-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: reportPresent
    ? report.tokenApprovalsRequiredBeforeLiquidity
      ? "AstraTreasury rechecked DEX liquidity token approval requirements after funding. Token approvals are still required before liquidity can be minted. No token approval has executed, no liquidity has been added, public trading is not approved, and full launch is not approved."
      : "AstraTreasury rechecked DEX liquidity token approval requirements after funding. Current allowances are sufficient for the reviewed liquidity amounts. No token approval has executed, no liquidity has been added, public trading is not approved, and full launch is not approved."
    : "AstraTreasury DEX liquidity token approval requirements recheck has not completed successfully.",
  summary: {
    reportPresent,
    tokenApprovalRequirementsRecheckComplete: report?.tokenApprovalRequirementsRecheckComplete === true,
    liquiditySafeAddress: report?.liquiditySafeAddress || "",
    approvalSpender: report?.approvalSpender || "",
    tokenCount: report?.tokenCount || 0,
    tokenApprovalsRequiredBeforeLiquidity: report?.tokenApprovalsRequiredBeforeLiquidity ?? "",
    allRequiredBalancesAvailable: report?.allRequiredBalancesAvailable === true,
    allRequiredAllowancesAvailable: report?.allRequiredAllowancesAvailable === true,
    fundingTransferExecuted: report?.fundingTransferExecuted === true,
    treasuryFundsMoved: report?.treasuryFundsMoved === true,
    tokenApprovalPayloadGenerated: false,
    tokenApprovalExecuted: false,
    liquidityMintCalldataGenerated: false,
    liquiditySafePayloadGenerated: false,
    liquidityAdded: false,
    positionMinted: false,
    publicTradingApproved: false,
    fullLaunchApproved: false,
    nextRecommendedMilestone,
    artifactCount: artifactHashes.length
  },
  tokenApprovalRequirementsRecheck: {
    recheckHash: report?.recheckHash || "",
    hashAlgorithm: "SHA-256",
    tokenApprovalRequirements: report?.tokenApprovalRequirements || [],
    requiredBeforeTokenApprovalPayloadGenerationApproval: report?.requiredBeforeTokenApprovalPayloadGenerationApproval || {},
    requiredBeforeLiquidityCalldataGenerationApproval: report?.requiredBeforeLiquidityCalldataGenerationApproval || {},
    artifactHashes
  },
  currentStatuses: {
    dexFundingTransferPostExecutionBalances: postBalanceStatus.status || "UNKNOWN",
    dexFundingTransferSafeExecutionLive: executionLiveStatus.status || "UNKNOWN",
    dexPoolPostExecutionVerification: poolStatus.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
  restrictions: {
    tokenApprovalPayloadGeneration: false,
    tokenApprovalExecution: false,
    liquidityProvision: false,
    publicTrading: false,
    buyPageActivation: false,
    globalTreasuryFunding: false,
    fullLaunch: false
  },
  safety: {
    recheckOnly: true,
    executesTokenApproval: false,
    generatesTokenApprovalPayload: false,
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

const requiredRows = Object.entries(
  report?.tokenApprovalsRequiredBeforeLiquidity
    ? publicPayload.tokenApprovalRequirementsRecheck.requiredBeforeTokenApprovalPayloadGenerationApproval
    : publicPayload.tokenApprovalRequirementsRecheck.requiredBeforeLiquidityCalldataGenerationApproval
).map(([key, value]) => {
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
  <title>AstraTreasury DEX Token Approval Requirements Recheck</title>
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
    <div class="badge">Token approval requirements rechecked · no approvals executed · no liquidity</div>
    <h1>DEX Token Approval Requirements Recheck</h1>
    <p>${escapeHtml(publicPayload.publicStatement)}</p>
    <p><strong>Recheck hash:</strong> <code>${escapeHtml(publicPayload.tokenApprovalRequirementsRecheck.recheckHash)}</code></p>
  </section>

  <section class="card">
    <h2>Summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${summaryRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Token approval requirements</h2>
    <table>
      <thead><tr><th>Role</th><th>Symbol</th><th>Token</th><th>Desired</th><th>Balance</th><th>Allowance</th><th>Approval required</th></tr></thead>
      <tbody>${tokenRows || '<tr><td colspan="7">No token requirements.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Required before next step</h2>
    <table><thead><tr><th>Requirement</th><th>Status</th></tr></thead><tbody>${requiredRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table><thead><tr><th>Area</th><th>Status</th></tr></thead><tbody>${statusRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This is a recheck only. No token approvals have executed, liquidity has not been added,
      public trading is not approved, and full launch is not approved.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-liquidity-token-approval-requirements-recheck">/api/public/dex-liquidity-token-approval-requirements-recheck</a></p>
    <p><a href="/dex-liquidity-funding-transfer-post-execution-balances">DEX Funding Transfer Post-Execution Balances</a></p>
    <p><a href="/dex-liquidity-funding-transfer-safe-execution-live">DEX Funding Transfer Safe Execution Live</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Token Approval Requirements Recheck");
console.log("=====================================================");
console.log(`Status: ${publicPayload.status}`);
console.log(`Approval requirements rechecked: ${publicPayload.summary.tokenApprovalRequirementsRecheckComplete}`);
console.log(`Token approvals required: ${publicPayload.summary.tokenApprovalsRequiredBeforeLiquidity}`);
console.log(`All required balances available: ${publicPayload.summary.allRequiredBalancesAvailable}`);
console.log(`All required allowances available: ${publicPayload.summary.allRequiredAllowancesAvailable}`);
console.log(`Token approval executed: ${publicPayload.summary.tokenApprovalExecuted}`);
console.log(`Liquidity added: ${publicPayload.summary.liquidityAdded}`);
console.log(`Report: ${statusReportFile}`);
