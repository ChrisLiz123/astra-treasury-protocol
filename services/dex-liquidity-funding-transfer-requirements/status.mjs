import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const reviewRelativePath = "reports/dex-liquidity-funding-transfer-requirements/dex-liquidity-funding-transfer-requirements-review.json";

const reportDir = path.join(root, "reports", "dex-liquidity-funding-transfer-requirements");
const reportFile = path.join(reportDir, "dex-liquidity-funding-transfer-requirements-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-liquidity-funding-transfer-requirements-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-liquidity-funding-transfer-requirements.html");

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
const reviewPresent = Boolean(review && review.schema === "astra-dex-liquidity-funding-transfer-requirements-review-v0.1");

const fundingApproval = readJson("public-docs/dex-liquidity-treasury-funding-approval-status.json");
const mintReview = readJson("public-docs/dex-liquidity-mint-parameter-review-status.json");
const tokenApproval = readJson("public-docs/dex-liquidity-token-approval-requirements-status.json");
const liquidityApproval = readJson("public-docs/dex-liquidity-provision-approval-status.json");
const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const status = reviewPresent
  ? review.status
  : "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_REQUIREMENTS_REVIEW_NOT_RUN";

const artifactPaths = [
  reviewRelativePath,
  "public-docs/dex-liquidity-treasury-funding-approval-status.json",
  "public-docs/dex-liquidity-mint-parameter-review-status.json",
  "public-docs/dex-liquidity-token-approval-requirements-status.json",
  "public-docs/dex-liquidity-provision-approval-status.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
].filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths.map((artifactPath) => sha256File(artifactPath));

const requirements = review?.fundingTransferRequirements || {};
const source = review?.fundingSource || {};
const destination = review?.fundingDestination || {};

const transferRows = (requirements.tokenTransferRequirements || []).map((item) => {
  return `<tr>
    <td>${escapeHtml(item.role)}</td>
    <td>${escapeHtml(item.symbol)}</td>
    <td><code>${escapeHtml(item.tokenAddress)}</code></td>
    <td>${escapeHtml(item.desiredHuman)}</td>
    <td>${escapeHtml(item.currentSafeBalanceHuman)}</td>
    <td>${escapeHtml(item.shortfallHuman)}</td>
    <td>${escapeHtml(item.fundingTransferRequiredForThisToken)}</td>
  </tr>`;
}).join("");

const payload = {
  schema: "astra-dex-liquidity-funding-transfer-requirements-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: status === "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_REQUIREMENTS_REVIEW_COMPLETE_NO_FUNDS_MOVED"
    ? "AstraTreasury reviewed DEX liquidity funding-transfer requirements. Token shortfalls are calculated, no funding-transfer payload is generated, no treasury funds have moved, no token approvals have been executed, no liquidity has been added, public trading is not approved, and full launch is not approved."
    : "AstraTreasury DEX liquidity funding-transfer requirements review has not completed successfully.",
  summary: {
    reviewPresent,
    fundingTransferRequirementsReviewed: status === "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_REQUIREMENTS_REVIEW_COMPLETE_NO_FUNDS_MOVED",
    poolAddress: review?.poolContext?.poolAddress || "",
    poolLiquidity: review?.poolContext?.poolLiquidity || "",
    sourceReference: source.sourceReference || "",
    sourceAddressProvided: source.sourceAddressProvided === true,
    sourceAddressRequiredBeforePayloadGeneration: source.sourceAddressRequiredBeforePayloadGeneration === true,
    destinationSafeAddress: destination.destinationSafeAddress || "",
    additionalFundingRequiredBeforeLiquidity: requirements.additionalFundingRequiredBeforeLiquidity === true,
    tokensRequiringFundingCount: requirements.tokensRequiringFundingCount || 0,
    fundingTransferPayloadGenerated: false,
    fundingTransferExecuted: false,
    tokenApprovalExecuted: false,
    liquidityAdded: false,
    positionMinted: false,
    treasuryFundsMoved: false,
    publicTradingApproved: false,
    fullLaunchApproved: false,
    nextRecommendedMilestone: "DEX Liquidity Treasury Funding Transfer Approval",
    artifactCount: artifactHashes.length
  },
  fundingTransferRequirementsReview: {
    reviewHash: review?.reviewHash || "",
    hashAlgorithm: "SHA-256",
    poolContext: review?.poolContext || {},
    fundingSource: source,
    fundingDestination: destination,
    fundingTransferRequirements: requirements,
    requiredBeforeFundingTransferApproval: review?.requiredBeforeFundingTransferApproval || {},
    artifactHashes
  },
  currentStatuses: {
    dexLiquidityTreasuryFundingApproval: fundingApproval.status || "UNKNOWN",
    dexLiquidityMintParameterReview: mintReview.status || "UNKNOWN",
    dexLiquidityTokenApprovalRequirements: tokenApproval.status || "UNKNOWN",
    dexLiquidityProvisionApproval: liquidityApproval.status || "UNKNOWN",
    dexPoolPostExecutionVerification: postExecution.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
  restrictions: {
    fundingTransferPayloadGeneration: false,
    fundingTransferExecution: false,
    tokenApprovalExecution: false,
    liquidityProvision: false,
    publicTrading: false,
    buyPageActivation: false,
    globalTreasuryFunding: false,
    fullLaunch: false
  },
  safety: {
    reviewOnly: true,
    generatesFundingTransferCalldata: false,
    generatesSafePayload: false,
    movesTreasuryFunds: false,
    executesTokenApproval: false,
    addsLiquidity: false,
    mintsPosition: false,
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

const requiredRows = Object.entries(payload.fundingTransferRequirementsReview.requiredBeforeFundingTransferApproval || {}).map(([key, value]) => {
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
  <title>AstraTreasury DEX Funding Transfer Requirements</title>
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
    <div class="badge">Funding transfer requirements · no funds moved</div>
    <h1>DEX Funding Transfer Requirements</h1>
    <p>${escapeHtml(payload.publicStatement)}</p>
    <p><strong>Review hash:</strong> <code>${escapeHtml(payload.fundingTransferRequirementsReview.reviewHash)}</code></p>
  </section>

  <section class="card">
    <h2>Summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${summaryRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Required funding transfers</h2>
    <table>
      <thead><tr><th>Role</th><th>Symbol</th><th>Token</th><th>Desired</th><th>Current Safe balance</th><th>Shortfall</th><th>Transfer required</th></tr></thead>
      <tbody>${transferRows || '<tr><td colspan="7">No transfer requirements available.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Required before funding transfer approval</h2>
    <table><thead><tr><th>Requirement</th><th>Status</th></tr></thead><tbody>${requiredRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table><thead><tr><th>Area</th><th>Status</th></tr></thead><tbody>${statusRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This page reviews funding requirements only. It does not generate transfer calldata,
      move treasury funds, approve tokens, add liquidity, activate the buy page, or approve public trading.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-liquidity-funding-transfer-requirements">/api/public/dex-liquidity-funding-transfer-requirements</a></p>
    <p><a href="/dex-liquidity-treasury-funding-approval">DEX Liquidity Treasury Funding Approval</a></p>
    <p><a href="/dex-liquidity-mint-parameter-review">DEX Mint Parameter Review</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Funding Transfer Requirements");
console.log("===============================================");
console.log(`Status: ${payload.status}`);
console.log(`Tokens requiring funding: ${payload.summary.tokensRequiringFundingCount}`);
console.log(`Funding transfer payload generated: ${payload.summary.fundingTransferPayloadGenerated}`);
console.log(`Funding transfer executed: ${payload.summary.fundingTransferExecuted}`);
console.log(`Liquidity added: ${payload.summary.liquidityAdded}`);
console.log(`Report: ${reportFile}`);
