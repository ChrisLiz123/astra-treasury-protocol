import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-liquidity-treasury-funding-approval/dex-liquidity-treasury-funding-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const requiredFiles = [
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

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function isZeroAddress(value) {
  return String(value || "").toLowerCase() === "0x0000000000000000000000000000000000000000";
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required DEX liquidity treasury funding approval file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden funding/liquidity/public-trading artifact exists. Approval must not move funds or add liquidity.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-treasury-funding-approval.config.json");
  const approvalRecordPresent = fs.existsSync(recordPath);

  const mintReviewStatus = readJson("public-docs/dex-liquidity-mint-parameter-review-status.json");
  const mintReview = readJson("reports/dex-liquidity-mint-parameter-review/dex-liquidity-mint-parameter-review.json");
  const tokenApproval = readJson("public-docs/dex-liquidity-token-approval-requirements-status.json");
  const liquidityApproval = readJson("public-docs/dex-liquidity-provision-approval-status.json");
  const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const poolCreated = readJson("reports/dex-pool-creation/live/dex-pool-created.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.approvalPrepared !== true || config.approvalOnly !== true || config.scopedApprovalOnly !== true) {
    issue("config", "DEX liquidity treasury funding approval must be prepared, approval-only, and scoped.");
  }

  if (config.dexLiquidityTreasuryFundingApprovalRecorded !== approvalRecordPresent) {
    issue("config.dexLiquidityTreasuryFundingApprovalRecorded", "Config approval flag must match record presence.");
  }

  if (config.dexLiquidityTreasuryFundingApproved !== approvalRecordPresent) {
    issue("config.dexLiquidityTreasuryFundingApproved", "Config approved flag must be true only after record exists.");
  }

  for (const key of [
    "globalTreasuryFundingApproved",
    "globalTreasuryFundingExecuted",
    "fundingTransferPayloadGenerated",
    "fundingTransferSubmitted",
    "fundingTransferExecuted",
    "tokenApprovalPayloadGenerated",
    "tokenApprovalExecuted",
    "liquidityMintCalldataGenerated",
    "liquiditySafePayloadGenerated",
    "liquiditySafeTransactionSubmitted",
    "liquiditySafeTransactionExecuted",
    "liquidityAdded",
    "positionMinted",
    "treasuryFundsMoved",
    "publicTradingApproved",
    "publicTradingLinkApproved",
    "buyPageActivationApproved",
    "fullLaunchApproved"
  ]) {
    if (config[key] !== false) {
      issue(`config.${key}`, `${key} must remain false.`);
    }
  }

  if (mintReviewStatus.status !== "DEX_LIQUIDITY_MINT_PARAMETER_REVIEW_COMPLETE_NO_PAYLOAD_NO_LIQUIDITY") {
    issue("mintReviewStatus.status", "Mint parameter review must be complete.");
  }

  if (mintReviewStatus.summary?.mintParametersReviewed !== true) {
    issue("mintReviewStatus.summary.mintParametersReviewed", "Mint parameters must be reviewed.");
  }

  if (mintReviewStatus.summary?.liquidityAdded !== false || mintReviewStatus.summary?.treasuryFundsMoved !== false || mintReviewStatus.summary?.publicTradingApproved !== false) {
    issue("mintReviewStatus.summary", "Mint review must show no liquidity, no treasury funds moved, and no public trading.");
  }

  if (!Array.isArray(mintReview.riskControls?.tokenBalanceAllowanceContext) || mintReview.riskControls.tokenBalanceAllowanceContext.length < 2) {
    issue("mintReview.riskControls.tokenBalanceAllowanceContext", "Mint review must include token balance/allowance context.");
  }

  if (tokenApproval.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_REVIEW_COMPLETE_NO_APPROVALS_EXECUTED") {
    issue("tokenApproval.status", "Token approval requirements review must be complete.");
  }

  if (liquidityApproval.status !== "DEX_LIQUIDITY_PROVISION_APPROVED_NO_LIQUIDITY_ADDED_NO_FUNDS_MOVED") {
    issue("liquidityApproval.status", "Liquidity provision approval must be recorded.");
  }

  if (postExecution.status !== "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("postExecution.status", "Post-execution pool verification must be complete.");
  }

  if (postExecution.summary?.liquidityVerifiedZero !== true || String(postExecution.summary?.poolLiquidity || "") !== "0") {
    issue("postExecution.summary.poolLiquidity", "Pool liquidity must remain zero.");
  }

  if (poolCreated.status !== "DEX_POOL_CREATED_BY_SAFE_EXECUTION_NO_LIQUIDITY") {
    issue("poolCreated.status", "Pool-created evidence must show no liquidity.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Global treasury funding must remain not approved and not executed.");
  }

  if (capabilityMatrix.allCapabilitiesDisabled !== true || capabilityMatrix.allCapabilityApprovalsFalse !== true) {
    issue("capabilityMatrix", "Capability Matrix must remain all-disabled.");
  }

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("execution.mode", "Mainnet execution queue must remain disabled.");
  }

  if (approvalRecordPresent) {
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));

    if (record.schema !== "astra-dex-liquidity-treasury-funding-approval-record-v0.1") {
      issue("record.schema", "Invalid DEX liquidity treasury funding approval record schema.");
    }

    if (record.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_APPROVED_NO_FUNDS_MOVED_NO_LIQUIDITY_ADDED") {
      issue("record.status", "Unexpected DEX liquidity treasury funding approval status.");
    }

    if (record.dexLiquidityTreasuryFundingApproved !== true) {
      issue("record.dexLiquidityTreasuryFundingApproved", "Record must approve scoped DEX liquidity treasury funding planning.");
    }

    if (!isAddress(record.poolAddress) || isZeroAddress(record.poolAddress)) {
      issue("record.poolAddress", "Pool address must be non-zero.");
    }

    for (const key of [
      "globalTreasuryFundingApproved",
      "globalTreasuryFundingExecuted",
      "fundingTransferPayloadGenerated",
      "fundingTransferSubmitted",
      "fundingTransferExecuted",
      "tokenApprovalPayloadGenerated",
      "tokenApprovalExecuted",
      "liquidityMintCalldataGenerated",
      "liquiditySafePayloadGenerated",
      "liquiditySafeTransactionSubmitted",
      "liquiditySafeTransactionExecuted",
      "liquidityAdded",
      "positionMinted",
      "treasuryFundsMoved",
      "publicTradingApproved",
      "publicTradingLinkApproved",
      "buyPageActivated",
      "fullLaunchApproved"
    ]) {
      if (record[key] !== false) {
        issue(`record.${key}`, `${key} must remain false.`);
      }
    }
  }
}

const result = {
  schema: "astra-dex-liquidity-treasury-funding-approval-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  recordFile: recordRelativePath,
  approvalRecordPresent: fs.existsSync(recordPath),
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
