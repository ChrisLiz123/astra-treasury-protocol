import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const reviewRelativePath = "reports/dex-liquidity-token-approval-requirements/dex-liquidity-token-approval-requirements-review.json";

const requiredFiles = [
  "configs/dex-liquidity-token-approval-requirements.config.json",
  "docs/dex-liquidity-token-approval-requirements/DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_REVIEW.md",
  "docs/dex-liquidity-token-approval-requirements/DEX_LIQUIDITY_TOKEN_APPROVAL_CHECKLIST.md",
  "docs/dex-liquidity-token-approval-requirements/DEX_LIQUIDITY_TOKEN_APPROVAL_BOUNDARIES.md",
  "docs/dex-liquidity-token-approval-requirements/DEX_LIQUIDITY_TOKEN_APPROVAL_RUNBOOK.md",
  "scripts/review-dex-liquidity-token-approval-requirements.mjs",
  reviewRelativePath,
  "public-docs/dex-liquidity-provision-approval-status.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/dex-pool-creation-safe-execution-live-status.json",
  "reports/dex-pool-creation/live/dex-pool-created.json",
  "public-docs/dex-liquidity-parameter-approval-status.json",
  "public-docs/dex-liquidity-source-safe-impact-status.json",
  "public-docs/dex-liquidity-parameter-selection-status.json",
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
    issue(file, "Missing required liquidity token approval requirements file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden liquidity/public-trading artifact exists. Review must not add liquidity or enable trading.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-token-approval-requirements.config.json");
  const review = readJson(reviewRelativePath);
  const liquidityApproval = readJson("public-docs/dex-liquidity-provision-approval-status.json");
  const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.reviewPrepared !== true || config.reviewOnly !== true) {
    issue("config", "Token approval requirements review must be prepared and review-only.");
  }

  if (review.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_REVIEW_COMPLETE_NO_APPROVALS_EXECUTED") {
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

  if (!isAddress(review.approvalContext?.safeAddress)) {
    issue("review.approvalContext.safeAddress", "Safe address must be valid.");
  }

  if (!isAddress(review.approvalContext?.approvalSpenderAddress)) {
    issue("review.approvalContext.approvalSpenderAddress", "Approval spender must be valid.");
  }

  if (!Array.isArray(review.tokenApprovalRequirements) || review.tokenApprovalRequirements.length < 2) {
    issue("review.tokenApprovalRequirements", "Review must include both pool tokens.");
  }

  for (const token of review.tokenApprovalRequirements || []) {
    if (!isAddress(token.tokenAddress)) {
      issue(`review.tokenApprovalRequirements.${token.role}.tokenAddress`, "Token address must be valid.");
    }

    if (token.tokenCodePresent !== true) {
      issue(`review.tokenApprovalRequirements.${token.role}.tokenCodePresent`, "Token code must be present.");
    }

    if (!Number.isInteger(token.decimals) || token.decimals < 0) {
      issue(`review.tokenApprovalRequirements.${token.role}.decimals`, "Token decimals must be a non-negative integer.");
    }

    if (!/^\d+$/.test(String(token.balanceRaw || ""))) {
      issue(`review.tokenApprovalRequirements.${token.role}.balanceRaw`, "Balance must be a decimal integer string.");
    }

    if (!/^\d+$/.test(String(token.currentAllowanceRaw || ""))) {
      issue(`review.tokenApprovalRequirements.${token.role}.currentAllowanceRaw`, "Allowance must be a decimal integer string.");
    }

    if (token.approvalPayloadGenerated !== false || token.approvalExecuted !== false) {
      issue(`review.tokenApprovalRequirements.${token.role}.approvalFlags`, "Approval payload/execution flags must be false.");
    }
  }

  for (const key of [
    "tokenApprovalPayloadGenerated",
    "tokenApprovalSafePayloadGenerated",
    "tokenApprovalExecuted",
    "liquiditySafePayloadGenerated",
    "liquiditySafeTransactionSubmitted",
    "liquiditySafeTransactionExecuted",
    "liquidityAdded",
    "positionMinted",
    "treasuryFundingApproved",
    "treasuryFundsMoved",
    "publicTradingApproved",
    "publicTradingLinkApproved",
    "buyPageActivated",
    "fullLaunchApproved"
  ]) {
    if (review.flags?.[key] !== false) {
      issue(`review.flags.${key}`, `${key} must remain false.`);
    }
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
    issue("treasuryFunding", "Treasury funding must remain not approved and not executed.");
  }

  if (capabilityMatrix.allCapabilitiesDisabled !== true || capabilityMatrix.allCapabilityApprovalsFalse !== true) {
    issue("capabilityMatrix", "Capability Matrix must remain all-disabled.");
  }

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("execution.mode", "Mainnet execution queue must remain disabled.");
  }
}

const result = {
  schema: "astra-dex-liquidity-token-approval-requirements-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  reviewFile: reviewRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
