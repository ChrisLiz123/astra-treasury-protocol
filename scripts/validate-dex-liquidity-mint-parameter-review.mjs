import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const reviewRelativePath = "reports/dex-liquidity-mint-parameter-review/dex-liquidity-mint-parameter-review.json";

const requiredFiles = [
  "configs/dex-liquidity-mint-parameter-review.config.json",
  "docs/dex-liquidity-mint-parameter-review/DEX_LIQUIDITY_MINT_PARAMETER_REVIEW.md",
  "docs/dex-liquidity-mint-parameter-review/DEX_LIQUIDITY_MINT_PARAMETER_CHECKLIST.md",
  "docs/dex-liquidity-mint-parameter-review/DEX_LIQUIDITY_MINT_PARAMETER_BOUNDARIES.md",
  "docs/dex-liquidity-mint-parameter-review/DEX_LIQUIDITY_MINT_PARAMETER_RUNBOOK.md",
  "scripts/review-dex-liquidity-mint-parameters.mjs",
  reviewRelativePath,
  "public-docs/dex-liquidity-token-approval-requirements-status.json",
  "public-docs/dex-liquidity-provision-approval-status.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/dex-pool-creation-safe-execution-live-status.json",
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
    issue(file, "Missing required liquidity mint parameter review file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden liquidity/public-trading artifact exists. Review must not add liquidity or enable trading.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-mint-parameter-review.config.json");
  const review = readJson(reviewRelativePath);
  const tokenApproval = readJson("public-docs/dex-liquidity-token-approval-requirements-status.json");
  const liquidityApproval = readJson("public-docs/dex-liquidity-provision-approval-status.json");
  const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.reviewPrepared !== true || config.reviewOnly !== true) {
    issue("config", "Mint parameter review must be prepared and review-only.");
  }

  if (review.status !== "DEX_LIQUIDITY_MINT_PARAMETER_REVIEW_COMPLETE_NO_PAYLOAD_NO_LIQUIDITY") {
    issue("review.status", `Unexpected review status: ${review.status}`);
  }

  if (review.reviewOnly !== true) {
    issue("review.reviewOnly", "Review must be review-only.");
  }

  if (!isAddress(review.poolContext?.poolAddress) || isZeroAddress(review.poolContext?.poolAddress)) {
    issue("review.poolContext.poolAddress", "Pool address must be non-zero.");
  }

  if (String(review.poolContext?.poolLiquidity || "") !== "0") {
    issue("review.poolContext.poolLiquidity", "Pool liquidity must remain zero.");
  }

  if (!Number.isInteger(review.poolContext?.tickSpacing) || review.poolContext.tickSpacing <= 0) {
    issue("review.poolContext.tickSpacing", "Tick spacing must be positive.");
  }

  const params = review.mintParameters || {};

  if (!isAddress(params.token0) || !isAddress(params.token1)) {
    issue("review.mintParameters.tokens", "token0/token1 must be valid addresses.");
  }

  if (!Number.isInteger(params.fee) || params.fee <= 0) {
    issue("review.mintParameters.fee", "Fee must be positive.");
  }

  if (!Number.isInteger(params.tickLower) || !Number.isInteger(params.tickUpper) || params.tickLower >= params.tickUpper) {
    issue("review.mintParameters.tickRange", "tickLower/tickUpper must be valid and ordered.");
  }

  if (!/^\d+$/.test(String(params.amount0DesiredRaw || "")) || BigInt(params.amount0DesiredRaw) <= 0n) {
    issue("review.mintParameters.amount0DesiredRaw", "amount0DesiredRaw must be positive.");
  }

  if (!/^\d+$/.test(String(params.amount1DesiredRaw || "")) || BigInt(params.amount1DesiredRaw) <= 0n) {
    issue("review.mintParameters.amount1DesiredRaw", "amount1DesiredRaw must be positive.");
  }

  if (!/^\d+$/.test(String(params.amount0MinRaw || "")) || BigInt(params.amount0MinRaw) > BigInt(params.amount0DesiredRaw)) {
    issue("review.mintParameters.amount0MinRaw", "amount0MinRaw must be <= amount0DesiredRaw.");
  }

  if (!/^\d+$/.test(String(params.amount1MinRaw || "")) || BigInt(params.amount1MinRaw) > BigInt(params.amount1DesiredRaw)) {
    issue("review.mintParameters.amount1MinRaw", "amount1MinRaw must be <= amount1DesiredRaw.");
  }

  if (!isAddress(params.recipient)) {
    issue("review.mintParameters.recipient", "Recipient must be valid.");
  }

  if (review.riskControls?.lowerAlignedToTickSpacing !== true || review.riskControls?.upperAlignedToTickSpacing !== true) {
    issue("review.riskControls.tickAlignment", "Ticks must align to tick spacing.");
  }

  if (review.riskControls?.currentTickInRange !== true) {
    issue("review.riskControls.currentTickInRange", "Current tick should be in range for the reviewed initial liquidity path.");
  }

  for (const key of [
    "tokenApprovalPayloadGenerated",
    "tokenApprovalExecuted",
    "liquidityMintCalldataGenerated",
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

  if (tokenApproval.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_REVIEW_COMPLETE_NO_APPROVALS_EXECUTED") {
    issue("tokenApproval.status", "Token approval requirements review must be complete.");
  }

  if (liquidityApproval.status !== "DEX_LIQUIDITY_PROVISION_APPROVED_NO_LIQUIDITY_ADDED_NO_FUNDS_MOVED") {
    issue("liquidityApproval.status", "Liquidity provision planning approval must be recorded.");
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
  schema: "astra-dex-liquidity-mint-parameter-review-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  reviewFile: reviewRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
