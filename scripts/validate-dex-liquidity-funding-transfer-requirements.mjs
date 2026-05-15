import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const reviewRelativePath = "reports/dex-liquidity-funding-transfer-requirements/dex-liquidity-funding-transfer-requirements-review.json";

const requiredFiles = [
  "configs/dex-liquidity-funding-transfer-requirements.config.json",
  "docs/dex-liquidity-funding-transfer-requirements/DEX_LIQUIDITY_FUNDING_TRANSFER_REQUIREMENTS_REVIEW.md",
  "docs/dex-liquidity-funding-transfer-requirements/DEX_LIQUIDITY_FUNDING_TRANSFER_REQUIREMENTS_CHECKLIST.md",
  "docs/dex-liquidity-funding-transfer-requirements/DEX_LIQUIDITY_FUNDING_TRANSFER_REQUIREMENTS_BOUNDARIES.md",
  "docs/dex-liquidity-funding-transfer-requirements/DEX_LIQUIDITY_FUNDING_TRANSFER_REQUIREMENTS_RUNBOOK.md",
  "scripts/review-dex-liquidity-funding-transfer-requirements.mjs",
  reviewRelativePath,
  "public-docs/dex-liquidity-treasury-funding-approval-status.json",
  "reports/dex-liquidity-treasury-funding-approval/dex-liquidity-treasury-funding-approval-record.json",
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
    issue(file, "Missing required funding transfer requirements file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden funding/liquidity/public-trading artifact exists. Review must not move funds or add liquidity.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-funding-transfer-requirements.config.json");
  const review = readJson(reviewRelativePath);
  const fundingApproval = readJson("public-docs/dex-liquidity-treasury-funding-approval-status.json");
  const mintReviewStatus = readJson("public-docs/dex-liquidity-mint-parameter-review-status.json");
  const tokenApproval = readJson("public-docs/dex-liquidity-token-approval-requirements-status.json");
  const liquidityApproval = readJson("public-docs/dex-liquidity-provision-approval-status.json");
  const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.reviewPrepared !== true || config.reviewOnly !== true) {
    issue("config", "Funding transfer requirements review must be prepared and review-only.");
  }

  if (review.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_REQUIREMENTS_REVIEW_COMPLETE_NO_FUNDS_MOVED") {
    issue("review.status", `Unexpected review status: ${review.status}`);
  }

  if (review.reviewOnly !== true) {
    issue("review.reviewOnly", "Review must be review-only.");
  }

  if (!isAddress(review.poolContext?.poolAddress) || isZeroAddress(review.poolContext?.poolAddress)) {
    issue("review.poolContext.poolAddress", "Pool address must be non-zero.");
  }

  if (String(review.poolContext?.poolLiquidity || "") !== "0" || review.poolContext?.liquidityVerifiedZero !== true) {
    issue("review.poolContext.poolLiquidity", "Pool liquidity must remain zero.");
  }

  if (!review.fundingSource?.sourceReference) {
    issue("review.fundingSource.sourceReference", "Funding source reference must be recorded.");
  }

  if (review.fundingSource?.sourceAddress && !isAddress(review.fundingSource.sourceAddress)) {
    issue("review.fundingSource.sourceAddress", "Funding source address must be valid if supplied.");
  }

  if (!isAddress(review.fundingDestination?.destinationSafeAddress)) {
    issue("review.fundingDestination.destinationSafeAddress", "Destination Safe address must be valid.");
  }

  const req = review.fundingTransferRequirements || {};

  if (req.additionalFundingRequiredBeforeLiquidity !== true) {
    issue("review.fundingTransferRequirements.additionalFundingRequiredBeforeLiquidity", "Additional funding should be required for this milestone.");
  }

  if (!Array.isArray(req.tokenTransferRequirements) || req.tokenTransferRequirements.length < 2) {
    issue("review.fundingTransferRequirements.tokenTransferRequirements", "Token transfer requirements must include both tokens.");
  }

  if (!Number.isInteger(req.tokensRequiringFundingCount) || req.tokensRequiringFundingCount <= 0) {
    issue("review.fundingTransferRequirements.tokensRequiringFundingCount", "At least one token must require funding.");
  }

  for (const item of req.tokenTransferRequirements || []) {
    if (!isAddress(item.tokenAddress)) {
      issue(`review.tokenTransferRequirements.${item.role}.tokenAddress`, "Token address must be valid.");
    }

    if (!/^\d+$/.test(String(item.desiredRaw || ""))) {
      issue(`review.tokenTransferRequirements.${item.role}.desiredRaw`, "desiredRaw must be a decimal integer.");
    }

    if (!/^\d+$/.test(String(item.currentSafeBalanceRaw || ""))) {
      issue(`review.tokenTransferRequirements.${item.role}.currentSafeBalanceRaw`, "currentSafeBalanceRaw must be a decimal integer.");
    }

    if (!/^\d+$/.test(String(item.shortfallRaw || ""))) {
      issue(`review.tokenTransferRequirements.${item.role}.shortfallRaw`, "shortfallRaw must be a decimal integer.");
    }

    if (item.fundingTransferPayloadGenerated !== false || item.fundingTransferExecuted !== false) {
      issue(`review.tokenTransferRequirements.${item.role}.flags`, "Funding payload/execution flags must remain false.");
    }
  }

  for (const key of [
    "fundingTransferPayloadGenerated",
    "fundingTransferSafePayloadGenerated",
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
    "globalTreasuryFundingApproved",
    "globalTreasuryFundingExecuted",
    "publicTradingApproved",
    "publicTradingLinkApproved",
    "buyPageActivated",
    "fullLaunchApproved"
  ]) {
    if (review.flags?.[key] !== false) {
      issue(`review.flags.${key}`, `${key} must remain false.`);
    }
  }

  if (fundingApproval.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_APPROVED_NO_FUNDS_MOVED_NO_LIQUIDITY_ADDED") {
    issue("fundingApproval.status", "Scoped DEX liquidity treasury funding approval must be recorded.");
  }

  if (fundingApproval.summary?.additionalFundingRequiredBeforeLiquidity !== true) {
    issue("fundingApproval.summary.additionalFundingRequiredBeforeLiquidity", "Funding approval must show additional funding required.");
  }

  if (mintReviewStatus.status !== "DEX_LIQUIDITY_MINT_PARAMETER_REVIEW_COMPLETE_NO_PAYLOAD_NO_LIQUIDITY") {
    issue("mintReviewStatus.status", "Mint parameter review must be complete.");
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
}

const result = {
  schema: "astra-dex-liquidity-funding-transfer-requirements-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  reviewFile: reviewRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
