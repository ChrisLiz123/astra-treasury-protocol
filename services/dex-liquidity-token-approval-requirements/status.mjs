import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const reviewRelativePath = "reports/dex-liquidity-token-approval-requirements/dex-liquidity-token-approval-requirements-review.json";

const reportDir = path.join(root, "reports", "dex-liquidity-token-approval-requirements");
const reportFile = path.join(reportDir, "dex-liquidity-token-approval-requirements-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-liquidity-token-approval-requirements-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-liquidity-token-approval-requirements.html");

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

const review = readJson(reviewRelativePath, null);
const reviewPresent = Boolean(review && review.schema === "astra-dex-liquidity-token-approval-requirements-review-v0.1");

const liquidityApproval = readJson("public-docs/dex-liquidity-provision-approval-status.json");
const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const status = reviewPresent
  ? review.status
  : "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_REVIEW_NOT_RUN";

const artifactPaths = [
  reviewRelativePath,
  "public-docs/dex-liquidity-provision-approval-status.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
].filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths.map((artifactPath) => sha256File(artifactPath));

const tokenRows = (review?.tokenApprovalRequirements || []).map((token) => {
  return `<tr>
    <td>${escapeHtml(token.role)}</td>
    <td>${escapeHtml(token.symbol)}</td>
    <td><code>${escapeHtml(token.tokenAddress)}</code></td>
    <td>${escapeHtml(token.balanceHuman)}</td>
    <td>${escapeHtml(token.currentAllowanceHuman)}</td>
    <td>${escapeHtml(token.plannedAmountKnown ? token.plannedHumanAmount || token.plannedRawAmount : "not detected")}</td>
    <td>${escapeHtml(token.tokenApprovalLikelyRequiredForLaterMint)}</td>
  </tr>`;
}).join("");

const payload = {
  schema: "astra-dex-liquidity-token-approval-requirements-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: status === "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_REVIEW_COMPLETE_NO_APPROVALS_EXECUTED"
    ? "AstraTreasury reviewed DEX liquidity token approval requirements. No approval calldata is generated, no token approvals are executed, no liquidity is added, no treasury funds are moved, public trading is not approved, and full launch is not approved."
    : "AstraTreasury DEX liquidity token approval requirements review has not completed successfully.",
  summary: {
    reviewPresent,
    tokenApprovalRequirementsReviewed: status === "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_REVIEW_COMPLETE_NO_APPROVALS_EXECUTED",
    poolAddress: review?.poolContext?.poolAddress || "",
    poolLiquidity: review?.poolContext?.poolLiquidity || "",
    safeAddress: review?.approvalContext?.safeAddress || "",
    approvalSpenderAddress: review?.approvalContext?.approvalSpenderAddress || "",
    approvalsLikelyRequired: review?.approvalContext?.approvalsLikelyRequired === true,
    tokenApprovalPayloadGenerated: false,
    tokenApprovalExecuted: false,
    liquiditySafePayloadGenerated: false,
    liquidityAdded: false,
    positionMinted: false,
    treasuryFundsMoved: false,
    publicTradingApproved: false,
    fullLaunchApproved: false,
    nextRecommendedMilestone: "DEX Liquidity Mint Parameter Review",
    artifactCount: artifactHashes.length
  },
  tokenApprovalRequirements: {
    reviewHash: review?.reviewHash || "",
    hashAlgorithm: "SHA-256",
    poolContext: review?.poolContext || {},
    approvalContext: review?.approvalContext || {},
    tokenApprovalRequirements: review?.tokenApprovalRequirements || [],
    requiredBeforeTokenApprovalPayloadGeneration: review?.requiredBeforeTokenApprovalPayloadGeneration || {},
    artifactHashes
  },
  currentStatuses: {
    dexLiquidityProvisionApproval: liquidityApproval.status || "UNKNOWN",
    dexPoolPostExecutionVerification: postExecution.status || "UNKNOWN",
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
    realTreasuryFunding: false,
    fullLaunch: false
  },
  safety: {
    readOnlyRpcOnly: true,
    generatesApprovalCalldata: false,
    generatesSafePayload: false,
    approvesTokens: false,
    addsLiquidity: false,
    mintsPosition: false,
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

const requiredRows = Object.entries(payload.tokenApprovalRequirements.requiredBeforeTokenApprovalPayloadGeneration || {}).map(([key, value]) => {
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
  <title>AstraTreasury DEX Token Approval Requirements</title>
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
    <div class="badge">Token approval requirements · no approvals executed</div>
    <h1>DEX Token Approval Requirements</h1>
    <p>${escapeHtml(payload.publicStatement)}</p>
    <p><strong>Review hash:</strong> <code>${escapeHtml(payload.tokenApprovalRequirements.reviewHash)}</code></p>
  </section>

  <section class="card">
    <h2>Summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${summaryRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Token allowance review</h2>
    <table>
      <thead><tr><th>Role</th><th>Symbol</th><th>Token</th><th>Safe balance</th><th>Current allowance</th><th>Planned amount</th><th>Approval likely required</th></tr></thead>
      <tbody>${tokenRows || '<tr><td colspan="7">No token approval review available.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Required before token approval payload generation</h2>
    <table><thead><tr><th>Requirement</th><th>Status</th></tr></thead><tbody>${requiredRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table><thead><tr><th>Area</th><th>Status</th></tr></thead><tbody>${statusRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This page reviews token approval requirements only. It does not generate approval calldata,
      approve tokens, add liquidity, move treasury funds, activate the buy page, or approve public trading.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-liquidity-token-approval-requirements">/api/public/dex-liquidity-token-approval-requirements</a></p>
    <p><a href="/dex-liquidity-provision-approval">DEX Liquidity Provision Approval</a></p>
    <p><a href="/dex-pool-creation-post-execution-verification">DEX Post-Execution Pool Verification</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Token Approval Requirements");
console.log("=============================================");
console.log(`Status: ${payload.status}`);
console.log(`Approvals likely required: ${payload.summary.approvalsLikelyRequired}`);
console.log(`Token approval payload generated: ${payload.summary.tokenApprovalPayloadGenerated}`);
console.log(`Token approval executed: ${payload.summary.tokenApprovalExecuted}`);
console.log(`Liquidity added: ${payload.summary.liquidityAdded}`);
console.log(`Report: ${reportFile}`);
