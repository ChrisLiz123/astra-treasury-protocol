import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const reviewRelativePath = "reports/full-launch-readiness-review/full-launch-readiness-review.json";

const requiredFiles = [
  "configs/full-launch-readiness-review.config.json",
  "docs/full-launch-readiness-review/FULL_LAUNCH_READINESS_REVIEW.md",
  "docs/full-launch-readiness-review/FULL_LAUNCH_READINESS_REVIEW_CHECKLIST.md",
  "docs/full-launch-readiness-review/FULL_LAUNCH_READINESS_REVIEW_BOUNDARIES.md",
  "docs/full-launch-readiness-review/FULL_LAUNCH_READINESS_REVIEW_RUNBOOK.md",
  "scripts/review-full-launch-readiness.mjs",
  reviewRelativePath,
  "public-docs/buy.html",
  "public-docs/dex-buy-page-activation-live-status.json",
  "reports/dex-buy-page-activation-live/dex-buy-page-activation-live-record.json",
  "public-docs/dex-buy-page-activated-status.json",
  "public-docs/dex-public-trading-live-status.json",
  "reports/dex-buy-page/live/buy-page-activated.json",
  "reports/dex-public-trading/live/public-trading-live.json",
  "public-docs/dex-buy-page-activation-approval-status.json",
  "reports/dex-buy-page-activation-approval/dex-buy-page-activation-approval-record.json",
  "public-docs/dex-public-trading-link-approval-status.json",
  "reports/dex-public-trading-link-approval/dex-public-trading-link-approval-record.json",
  "public-docs/dex-public-trading-approval-status.json",
  "reports/dex-public-trading-approval/dex-public-trading-approval-record.json",
  "public-docs/dex-liquidity-post-execution-verification-status.json",
  "reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json"
];

const forbiddenFiles = [
  "public-docs/full-launch-approved-status.json",
  "public-docs/full-launch-live-status.json"
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

function isHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required full launch readiness review file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden full-launch artifact exists.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/full-launch-readiness-review.config.json");
  const review = readJson(reviewRelativePath);
  const buyActivationStatus = readJson("public-docs/dex-buy-page-activation-live-status.json");
  const buyActivation = readJson("reports/dex-buy-page-activation-live/dex-buy-page-activation-live-record.json");
  const publicTradingLive = readJson("reports/dex-public-trading/live/public-trading-live.json");
  const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");

  if (config.reviewOnly !== true) {
    issue("config.reviewOnly", "Config must be review-only.");
  }

  if (config.fullLaunchReadinessReviewComplete !== true || config.readyForFullLaunchApproval !== true) {
    issue("config.readinessFlags", "Config must show readiness review complete and ready for full launch approval.");
  }

  if (review.status !== "FULL_LAUNCH_READINESS_REVIEW_COMPLETE_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED") {
    issue("review.status", `Unexpected full launch readiness review status: ${review.status}`);
  }

  if (review.fullLaunchReadinessReviewComplete !== true || review.readyForFullLaunchApproval !== true) {
    issue("review.readinessFlags", "Review must show readiness complete and ready for full launch approval.");
  }

  if (review.buyPageActivated !== true || review.publicTradingLive !== true) {
    issue("review.publicLiveFlags", "Buy page must be activated and public trading live.");
  }

  if (!isHttpUrl(review.buyPageUrl) || !isHttpUrl(review.tradingLinkUrl)) {
    issue("review.urls", "Buy page URL and trading link URL must be valid.");
  }

  if (!isAddress(review.liquiditySafeAddress) || !isTxHash(review.executionTxHash)) {
    issue("review.identifiers", "Liquidity Safe and execution tx hash must be valid.");
  }

  if (BigInt(String(review.poolLiquidityLive || "0")) <= 0n) {
    issue("review.poolLiquidityLive", "Pool liquidity must be greater than zero.");
  }

  if (!sameAddress(review.positionOwnerLive, review.liquiditySafeAddress)) {
    issue("review.positionOwnerLive", "Position owner must be liquidity Safe.");
  }

  if (review.fullLaunchApproved !== false || review.treasuryFundingApproved !== false || review.treasuryFundingExecuted !== false) {
    issue("review.launchTreasuryFlags", "Full launch and global treasury funding must remain false.");
  }

  if (buyActivationStatus.status !== "DEX_BUY_PAGE_ACTIVATION_LIVE_RECORDED_BUY_PAGE_ACTIVATED_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED") {
    issue("buyActivationStatus.status", "Buy page activation live status must be complete.");
  }

  if (buyActivation.buyPageActivated !== true || buyActivation.publicTradingLive !== true) {
    issue("buyActivation.flags", "Buy page activation live must show activated and public trading live.");
  }

  if (publicTradingLive.publicTradingLive !== true || publicTradingLive.buyPageActivated !== true) {
    issue("publicTradingLive.flags", "Public trading live artifact must show trading live and buy page activated.");
  }

  if (postVerification.liquidityPostExecutionVerified !== true || postVerification.liquidityAdded !== true || postVerification.positionMinted !== true) {
    issue("postVerification.flags", "Post-execution verification must show verified, liquidity added, and position minted.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Global treasury funding must remain not approved/executed.");
  }

  if (capabilityMatrix.allCapabilityApprovalsFalse !== true) {
    issue("capabilityMatrix", "Capability approvals must remain false before full launch.");
  }
}

const result = {
  schema: "astra-full-launch-readiness-review-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  reviewFile: reviewRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
