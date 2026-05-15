import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const recordRelativePath = "reports/dex-liquidity-treasury-funding-approval/dex-liquidity-treasury-funding-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const reportDir = path.join(root, "reports", "dex-liquidity-treasury-funding-approval");
const reportFile = path.join(reportDir, "dex-liquidity-treasury-funding-approval-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-liquidity-treasury-funding-approval-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-liquidity-treasury-funding-approval.html");

fs.mkdirSync(reportDir, { recursive: true });

const artifactPaths = [
  "configs/dex-liquidity-treasury-funding-approval.config.json",
  "docs/dex-liquidity-treasury-funding-approval/DEX_LIQUIDITY_TREASURY_FUNDING_APPROVAL.md",
  "docs/dex-liquidity-treasury-funding-approval/DEX_LIQUIDITY_TREASURY_FUNDING_APPROVAL_CHECKLIST.md",
  "docs/dex-liquidity-treasury-funding-approval/DEX_LIQUIDITY_TREASURY_FUNDING_APPROVAL_BOUNDARIES.md",
  "docs/dex-liquidity-treasury-funding-approval/DEX_LIQUIDITY_TREASURY_FUNDING_APPROVAL_RUNBOOK.md",
  "scripts/record-dex-liquidity-treasury-funding-approval.mjs",
  "public-docs/dex-liquidity-mint-parameter-review-status.json",
  "reports/dex-liquidity-mint-parameter-review/dex-liquidity-mint-parameter-review.json",
  "public-docs/dex-liquidity-token-approval-requirements-status.json",
  "public-docs/dex-liquidity-provision-approval-status.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "reports/dex-pool-creation/live/dex-pool-created.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
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

const config = readJson("configs/dex-liquidity-treasury-funding-approval.config.json");
const record = readJsonPath(recordPath);
const approvalRecordPresent = Boolean(record && record.schema === "astra-dex-liquidity-treasury-funding-approval-record-v0.1");

const mintReviewStatus = readJson("public-docs/dex-liquidity-mint-parameter-review-status.json");
const mintReview = readJson("reports/dex-liquidity-mint-parameter-review/dex-liquidity-mint-parameter-review.json");
const tokenApproval = readJson("public-docs/dex-liquidity-token-approval-requirements-status.json");
const liquidityApproval = readJson("public-docs/dex-liquidity-provision-approval-status.json");
const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const checks = [];

function check(name, pass, details = {}) {
  checks.push({ name, pass: Boolean(pass), details });
}

const balanceContext = mintReview.riskControls?.tokenBalanceAllowanceContext || [];
const allDesiredBalancesCurrentlyAvailable =
  Array.isArray(balanceContext) &&
  balanceContext.length >= 2 &&
  balanceContext.every((item) => item.balanceCurrentlyCoversDesired === true);

const allDesiredAllowancesCurrentlyAvailable =
  Array.isArray(balanceContext) &&
  balanceContext.length >= 2 &&
  balanceContext.every((item) => item.allowanceCurrentlyCoversDesired === true);

check("Framework prepared", config.approvalPrepared === true && config.approvalOnly === true && config.scopedApprovalOnly === true, {
  approvalPrepared: config.approvalPrepared,
  approvalOnly: config.approvalOnly,
  scopedApprovalOnly: config.scopedApprovalOnly
});

check("Mint parameter review complete", mintReviewStatus.status === "DEX_LIQUIDITY_MINT_PARAMETER_REVIEW_COMPLETE_NO_PAYLOAD_NO_LIQUIDITY", {
  status: mintReviewStatus.status || "UNKNOWN"
});

check("Token approval requirements review complete", tokenApproval.status === "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_REVIEW_COMPLETE_NO_APPROVALS_EXECUTED", {
  status: tokenApproval.status || "UNKNOWN"
});

check("Liquidity provision planning approval recorded", liquidityApproval.status === "DEX_LIQUIDITY_PROVISION_APPROVED_NO_LIQUIDITY_ADDED_NO_FUNDS_MOVED", {
  status: liquidityApproval.status || "UNKNOWN"
});

check("Post-execution pool verification complete", postExecution.status === "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING", {
  status: postExecution.status || "UNKNOWN"
});

check("Pool liquidity remains zero", postExecution.summary?.liquidityVerifiedZero === true && String(postExecution.summary?.poolLiquidity || "") === "0", {
  liquidityVerifiedZero: postExecution.summary?.liquidityVerifiedZero,
  poolLiquidity: postExecution.summary?.poolLiquidity
});

check("Token balance/allowance context present", Array.isArray(balanceContext) && balanceContext.length >= 2, {
  tokenCount: Array.isArray(balanceContext) ? balanceContext.length : 0
});

check("Full launch not approved", fullLaunch.fullLaunchApproved === false, {
  fullLaunchApproved: fullLaunch.fullLaunchApproved
});

check("Global treasury funding not approved/executed", treasuryFunding.treasuryFundingApproved === false && treasuryFunding.treasuryFundingExecuted === false, {
  treasuryFundingApproved: treasuryFunding.treasuryFundingApproved,
  treasuryFundingExecuted: treasuryFunding.treasuryFundingExecuted
});

check("Capability Matrix remains all-disabled", capabilityMatrix.allCapabilitiesDisabled === true && capabilityMatrix.allCapabilityApprovalsFalse === true, {
  allCapabilitiesDisabled: capabilityMatrix.allCapabilitiesDisabled,
  allCapabilityApprovalsFalse: capabilityMatrix.allCapabilityApprovalsFalse
});

check("Execution queue disabled", execution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: execution.mode || "UNKNOWN"
});

const forbiddenFiles = [
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/payload/token-approval-safe-payload.json",
  "reports/dex-liquidity-treasury-funding/live/funds-moved.json",
  "reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

const forbiddenArtifactsPresent = forbiddenFiles.filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

check("No funding/liquidity/public-trading artifacts present", forbiddenArtifactsPresent.length === 0, {
  forbiddenArtifactsPresent
});

const missingArtifacts = artifactPaths.filter((artifactPath) => !fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths
  .filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)))
  .map((artifactPath) => sha256File(artifactPath));

if (fs.existsSync(recordPath)) {
  artifactHashes.push(sha256File(recordRelativePath));
}

const approvalPayload = {
  schema: "astra-dex-liquidity-treasury-funding-approval-public-payload-v0.1",
  approvalRecordPresent,
  dexLiquidityTreasuryFundingApproved: approvalRecordPresent,
  allDesiredBalancesCurrentlyAvailable,
  allDesiredAllowancesCurrentlyAvailable,
  fundingTransferPayloadGenerated: false,
  fundingTransferExecuted: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  treasuryFundsMoved: false,
  publicTradingApproved: false,
  fullLaunchApproved: false,
  artifactHashes
};

const approvalHash = sha256Json(approvalPayload);
const failures = checks.filter((item) => !item.pass);

const status = failures.length > 0
  ? "DEX_LIQUIDITY_TREASURY_FUNDING_APPROVAL_REVIEW_REQUIRED"
  : approvalRecordPresent
    ? "DEX_LIQUIDITY_TREASURY_FUNDING_APPROVED_NO_FUNDS_MOVED_NO_LIQUIDITY_ADDED"
    : "DEX_LIQUIDITY_TREASURY_FUNDING_APPROVAL_READY_PENDING_APPROVAL";

const approvalSummary = approvalRecordPresent
  ? {
      recordedAt: record.recordedAt,
      approver: record.approver,
      approvalReference: record.approvalReference,
      poolAddress: record.poolAddress,
      poolLiquidity: record.poolLiquidity,
      allDesiredBalancesCurrentlyAvailable: record.allDesiredBalancesCurrentlyAvailable,
      allDesiredAllowancesCurrentlyAvailable: record.allDesiredAllowancesCurrentlyAvailable,
      additionalFundingRequiredBeforeLiquidity: record.additionalFundingRequiredBeforeLiquidity,
      tokenApprovalsRequiredBeforeLiquidity: record.tokenApprovalsRequiredBeforeLiquidity,
      dexLiquidityTreasuryFundingApproved: true,
      fundingTransferPayloadGenerated: false,
      fundingTransferExecuted: false,
      tokenApprovalExecuted: false,
      liquidityAdded: false,
      positionMinted: false,
      treasuryFundsMoved: false,
      publicTradingApproved: false,
      fullLaunchApproved: false
    }
  : {
      recordedAt: "",
      approver: "not recorded",
      approvalReference: "not recorded",
      poolAddress: mintReviewStatus.summary?.poolAddress || postExecution.summary?.poolAddress || "",
      poolLiquidity: mintReviewStatus.summary?.poolLiquidity || postExecution.summary?.poolLiquidity || "",
      allDesiredBalancesCurrentlyAvailable,
      allDesiredAllowancesCurrentlyAvailable,
      additionalFundingRequiredBeforeLiquidity: !allDesiredBalancesCurrentlyAvailable,
      tokenApprovalsRequiredBeforeLiquidity: !allDesiredAllowancesCurrentlyAvailable,
      dexLiquidityTreasuryFundingApproved: false,
      fundingTransferPayloadGenerated: false,
      fundingTransferExecuted: false,
      tokenApprovalExecuted: false,
      liquidityAdded: false,
      positionMinted: false,
      treasuryFundsMoved: false,
      publicTradingApproved: false,
      fullLaunchApproved: false
    };

const report = {
  schema: "astra-dex-liquidity-treasury-funding-approval-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: approvalRecordPresent
    ? "AstraTreasury approved scoped DEX liquidity treasury funding planning for the reviewed mint amounts. No funding transfer payload has been generated, no treasury funds have moved, no token approvals have been executed, no liquidity has been added, public trading is not approved, and full launch is not approved."
    : "AstraTreasury DEX liquidity treasury funding approval framework is ready. Approval has not yet been recorded.",
  summary: {
    approvalRecordPresent,
    dexLiquidityTreasuryFundingApproved: approvalRecordPresent,
    poolAddress: approvalSummary.poolAddress,
    poolLiquidity: approvalSummary.poolLiquidity,
    allDesiredBalancesCurrentlyAvailable: approvalSummary.allDesiredBalancesCurrentlyAvailable,
    allDesiredAllowancesCurrentlyAvailable: approvalSummary.allDesiredAllowancesCurrentlyAvailable,
    additionalFundingRequiredBeforeLiquidity: approvalSummary.additionalFundingRequiredBeforeLiquidity,
    tokenApprovalsRequiredBeforeLiquidity: approvalSummary.tokenApprovalsRequiredBeforeLiquidity,
    fundingTransferPayloadGenerated: false,
    fundingTransferExecuted: false,
    tokenApprovalExecuted: false,
    liquidityAdded: false,
    positionMinted: false,
    treasuryFundsMoved: false,
    publicTradingApproved: false,
    fullLaunchApproved: false,
    nextRecommendedMilestone: approvalSummary.additionalFundingRequiredBeforeLiquidity
      ? "DEX Liquidity Treasury Funding Transfer Requirements Review"
      : "DEX Token Approval Payload Generation Approval",
    artifactCount: artifactHashes.length,
    missingArtifactCount: missingArtifacts.length,
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length
  },
  dexLiquidityTreasuryFundingApproval: {
    approvalHash,
    hashAlgorithm: "SHA-256",
    approvalSummary,
    fundingRequirements: record?.fundingRequirements || balanceContext,
    requiredBeforeFundingTransferOrApprovalPayloadGeneration: config.requiredBeforeFundingTransferOrApprovalPayloadGeneration || {},
    hardStops: config.hardStops || {},
    artifactHashes
  },
  checks,
  failures,
  missingArtifacts,
  currentStatuses: {
    dexLiquidityMintParameterReview: mintReviewStatus.status || "UNKNOWN",
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
    movesTreasuryFunds: false,
    generatesFundingTransferPayload: false,
    generatesTokenApprovalCalldata: false,
    generatesLiquidityCalldata: false,
    generatesSafePayload: false,
    approvesTokens: false,
    addsLiquidity: false,
    mintsPosition: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

writeJson(reportFile, report);
writeJson(publicJsonFile, report);

const approvalRows = Object.entries(approvalSummary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const fundingRows = (report.dexLiquidityTreasuryFundingApproval.fundingRequirements || []).map((item) => {
  return `<tr>
    <td>${escapeHtml(item.role)}</td>
    <td>${escapeHtml(item.symbol)}</td>
    <td><code>${escapeHtml(item.tokenAddress)}</code></td>
    <td>${escapeHtml(item.desiredHuman || item.desiredRaw || "")}</td>
    <td>${escapeHtml(item.safeBalanceHuman || item.safeBalanceRaw || "")}</td>
    <td>${escapeHtml(item.balanceCurrentlyCoversDesired)}</td>
    <td>${escapeHtml(item.additionalFundingRequiredForThisToken ?? (item.balanceCurrentlyCoversDesired !== true))}</td>
  </tr>`;
}).join("");

const requiredRows = Object.entries(report.dexLiquidityTreasuryFundingApproval.requiredBeforeFundingTransferOrApprovalPayloadGeneration).map(([key, value]) => {
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
  <title>AstraTreasury DEX Liquidity Treasury Funding Approval</title>
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
    <div class="badge">DEX liquidity treasury funding approval · no funds moved</div>
    <h1>DEX Liquidity Treasury Funding Approval</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
    <p><strong>Approval hash:</strong> <code>${escapeHtml(approvalHash)}</code></p>
  </section>

  <section class="card">
    <h2>Approval summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${approvalRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Funding requirements</h2>
    <table>
      <thead><tr><th>Role</th><th>Symbol</th><th>Token</th><th>Desired</th><th>Safe balance</th><th>Balance covers desired</th><th>Additional funding required</th></tr></thead>
      <tbody>${fundingRows || '<tr><td colspan="7">No funding requirements available.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Required before funding transfer or approval payload generation</h2>
    <table><thead><tr><th>Requirement</th><th>Status</th></tr></thead><tbody>${requiredRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Checks</h2>
    <table><thead><tr><th>Check</th><th>Status</th><th>Details</th></tr></thead><tbody>${checkRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table><thead><tr><th>Area</th><th>Status</th></tr></thead><tbody>${statusRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This scoped approval does not move funds, approve tokens, add liquidity, activate the buy page,
      approve public trading, approve global treasury funding, or approve full launch.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-liquidity-treasury-funding-approval">/api/public/dex-liquidity-treasury-funding-approval</a></p>
    <p><a href="/dex-liquidity-mint-parameter-review">DEX Mint Parameter Review</a></p>
    <p><a href="/dex-liquidity-token-approval-requirements">DEX Token Approval Requirements</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Liquidity Treasury Funding Approval");
console.log("=====================================================");
console.log(`Status: ${report.status}`);
console.log(`Approval record present: ${approvalRecordPresent}`);
console.log(`DEX liquidity treasury funding approved: ${report.summary.dexLiquidityTreasuryFundingApproved}`);
console.log(`Additional funding required: ${report.summary.additionalFundingRequiredBeforeLiquidity}`);
console.log(`Treasury funds moved: ${report.summary.treasuryFundsMoved}`);
console.log(`Liquidity added: ${report.summary.liquidityAdded}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
