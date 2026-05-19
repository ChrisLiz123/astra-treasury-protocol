import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const readinessRelativePath = "reports/dex-public-trading-readiness-review/dex-public-trading-readiness-review.json";

const requiredFiles = [
  "configs/dex-public-trading-readiness-review.config.json",
  "docs/dex-public-trading-readiness-review/DEX_PUBLIC_TRADING_READINESS_REVIEW.md",
  "docs/dex-public-trading-readiness-review/DEX_PUBLIC_TRADING_READINESS_REVIEW_CHECKLIST.md",
  "docs/dex-public-trading-readiness-review/DEX_PUBLIC_TRADING_READINESS_REVIEW_BOUNDARIES.md",
  "docs/dex-public-trading-readiness-review/DEX_PUBLIC_TRADING_READINESS_REVIEW_RUNBOOK.md",
  "scripts/review-dex-public-trading-readiness.mjs",
  readinessRelativePath,
  "public-docs/dex-liquidity-post-execution-verification-status.json",
  "reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json",
  "public-docs/dex-liquidity-safe-execution-live-status.json",
  "reports/dex-liquidity-safe-execution-live/dex-liquidity-safe-execution-live-record.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json"
];

const forbiddenFiles = [
  "public-docs/dex-public-trading-approval-status.json",
  "reports/dex-public-trading-approval/dex-public-trading-approval-record.json",
  "public-docs/dex-public-trading-live-status.json",
  "public-docs/dex-buy-page-activated-status.json",
  "public-docs/full-launch-approved-status.json"
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

function isTxHash(value) {
  return /^0x[0-9a-fA-F]{64}$/.test(String(value || "").trim());
}

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required DEX public trading readiness review file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden public-trading/buy-page/full-launch approval or live artifact exists.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-public-trading-readiness-review.config.json");
  const readiness = readJson(readinessRelativePath);
  const postStatus = readJson("public-docs/dex-liquidity-post-execution-verification-status.json");
  const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");
  const executionLiveStatus = readJson("public-docs/dex-liquidity-safe-execution-live-status.json");
  const executionLive = readJson("reports/dex-liquidity-safe-execution-live/dex-liquidity-safe-execution-live-record.json");
  const safePayload = readJson("reports/dex-liquidity-provision/payload/liquidity-safe-payload.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");

  if (config.reviewOnly !== true) {
    issue("config.reviewOnly", "Config must be review-only.");
  }

  if (config.publicTradingReadinessReviewComplete !== true || config.readyForPublicTradingApproval !== true) {
    issue("config.readinessFlags", "Config must show readiness review complete and ready for public trading approval.");
  }

  if (readiness.status !== "DEX_PUBLIC_TRADING_READINESS_REVIEW_COMPLETE_READY_FOR_PUBLIC_TRADING_APPROVAL_NO_BUY_PAGE_NO_FULL_LAUNCH") {
    issue("readiness.status", `Unexpected readiness review status: ${readiness.status}`);
  }

  if (readiness.publicTradingReadinessReviewComplete !== true || readiness.readyForPublicTradingApproval !== true) {
    issue("readiness.readinessFlags", "Readiness review must be complete and ready for public trading approval.");
  }

  if (!isAddress(readiness.liquiditySafeAddress) || !isTxHash(readiness.executionTxHash)) {
    issue("readiness.identifiers", "Liquidity Safe address and execution tx hash must be valid.");
  }

  if (readiness.executionTxHash !== executionLive.executionTxHash || readiness.executionTxHash !== postVerification.executionTxHash) {
    issue("readiness.executionTxHash", "Readiness execution tx hash must match execution live and post-execution verification.");
  }

  if (readiness.poolAddress !== postVerification.poolAddress) {
    issue("readiness.poolAddress", "Readiness pool address must match post-execution verification.");
  }

  if (BigInt(String(readiness.poolLiquidityLive || "0")) <= 0n) {
    issue("readiness.poolLiquidityLive", "Pool liquidity must be greater than zero.");
  }

  if (!String(readiness.positionTokenId || "").match(/^\d+$/)) {
    issue("readiness.positionTokenId", "Position token ID must be present.");
  }

  if (!isAddress(readiness.positionOwnerLive) || !sameAddress(readiness.positionOwnerLive, readiness.liquiditySafeAddress)) {
    issue("readiness.positionOwnerLive", "Position owner must be the liquidity Safe.");
  }

  if (BigInt(String(readiness.positionDetailsLive?.liquidity || "0")) <= 0n) {
    issue("readiness.positionDetailsLive.liquidity", "Position liquidity must be greater than zero.");
  }

  const mintParams = safePayload.mintParams || {};

  if (!sameAddress(readiness.positionDetailsLive?.token0, mintParams.token0)) {
    issue("readiness.positionDetailsLive.token0", "Position token0 must match Safe payload.");
  }

  if (!sameAddress(readiness.positionDetailsLive?.token1, mintParams.token1)) {
    issue("readiness.positionDetailsLive.token1", "Position token1 must match Safe payload.");
  }

  if (String(readiness.positionDetailsLive?.fee) !== String(mintParams.fee)) {
    issue("readiness.positionDetailsLive.fee", "Position fee must match Safe payload.");
  }

  if (String(readiness.positionDetailsLive?.tickLower) !== String(mintParams.tickLower)) {
    issue("readiness.positionDetailsLive.tickLower", "Position tickLower must match Safe payload.");
  }

  if (String(readiness.positionDetailsLive?.tickUpper) !== String(mintParams.tickUpper)) {
    issue("readiness.positionDetailsLive.tickUpper", "Position tickUpper must match Safe payload.");
  }

  if (readiness.publicTradingApproved !== false || readiness.publicTradingLive !== false || readiness.buyPageActivated !== false || readiness.fullLaunchApproved !== false) {
    issue("readiness.publicFlags", "Public trading, buy page, and full launch must remain false.");
  }

  if (postStatus.status !== "DEX_LIQUIDITY_POST_EXECUTION_VERIFIED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING") {
    issue("postStatus.status", "Post-execution verification must be complete.");
  }

  if (postVerification.liquidityPostExecutionVerified !== true || postVerification.liquidityAdded !== true || postVerification.positionMinted !== true) {
    issue("postVerification.flags", "Post-execution verification must show verified, liquidity added, and position minted.");
  }

  if (executionLiveStatus.status !== "DEX_LIQUIDITY_SAFE_EXECUTION_LIVE_RECORDED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING") {
    issue("executionLiveStatus.status", "Execution live status must be complete.");
  }

  if (executionLive.liquiditySafeTransactionExecuted !== true || executionLive.liquidityAdded !== true || executionLive.positionMinted !== true) {
    issue("executionLive.flags", "Execution live must show executed, liquidity added, and position minted.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Global treasury funding must remain not approved/executed.");
  }

  if (capabilityMatrix.allCapabilityApprovalsFalse !== true) {
    issue("capabilityMatrix", "Capability approvals must remain false.");
  }
}

const result = {
  schema: "astra-dex-public-trading-readiness-review-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  readinessFile: readinessRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
