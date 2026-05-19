import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const reviewRelativePath = "reports/global-treasury-funding-approval-review/global-treasury-funding-approval-review.json";

const requiredFiles = [
  "configs/global-treasury-funding-approval-review.config.json",
  "docs/global-treasury-funding-approval-review/GLOBAL_TREASURY_FUNDING_APPROVAL_REVIEW.md",
  "docs/global-treasury-funding-approval-review/GLOBAL_TREASURY_FUNDING_APPROVAL_REVIEW_CHECKLIST.md",
  "docs/global-treasury-funding-approval-review/GLOBAL_TREASURY_FUNDING_APPROVAL_REVIEW_BOUNDARIES.md",
  "docs/global-treasury-funding-approval-review/GLOBAL_TREASURY_FUNDING_APPROVAL_REVIEW_RUNBOOK.md",
  "scripts/review-global-treasury-funding-approval.mjs",
  reviewRelativePath,
  "public-docs/full-launch-live-status.json",
  "reports/full-launch-live/full-launch-live-record.json",
  "reports/full-launch/live/full-launch-live.json",
  "public-docs/full-launch-status.json",
  "public-docs/full-launch-approval-status.json",
  "reports/full-launch-approval/full-launch-approval-record.json",
  "public-docs/dex-buy-page-activation-live-status.json",
  "reports/dex-buy-page-activation-live/dex-buy-page-activation-live-record.json",
  "public-docs/dex-public-trading-live-status.json",
  "reports/dex-public-trading/live/public-trading-live.json",
  "public-docs/dex-liquidity-post-execution-verification-status.json",
  "reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/launch.html",
  "public-docs/buy.html"
];

const forbiddenFiles = [
  "reports/global-treasury-funding-approval/global-treasury-funding-approval-record.json",
  "public-docs/global-treasury-funding-approval-status.json",
  "reports/global-treasury-funding-live/global-treasury-funding-live-record.json",
  "public-docs/global-treasury-funding-live-status.json",
  "reports/treasury-funding/live/treasury-funding-executed.json",
  "public-docs/treasury-funding-executed-status.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function boolValue(...values) {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (String(value).toLowerCase() === "true") return true;
    if (String(value).toLowerCase() === "false") return false;
  }
  return undefined;
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
    issue(file, "Missing required global treasury funding approval review file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden global treasury funding approval/execution artifact exists.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/global-treasury-funding-approval-review.config.json");
  const review = readJson(reviewRelativePath);
  const fullLaunchLiveStatus = readJson("public-docs/full-launch-live-status.json");
  const fullLaunchLive = readJson("reports/full-launch-live/full-launch-live-record.json");
  const fullLaunchStatus = readJson("public-docs/full-launch-status.json");
  const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");

  if (config.reviewOnly !== true) {
    issue("config.reviewOnly", "Config must be review-only.");
  }

  if (config.globalTreasuryFundingApprovalReviewComplete !== true || config.readyForGlobalTreasuryFundingApproval !== true) {
    issue("config.readinessFlags", "Config must show review complete and ready for global treasury funding approval.");
  }

  if (review.status !== "GLOBAL_TREASURY_FUNDING_APPROVAL_REVIEW_COMPLETE_FULL_LAUNCH_LIVE_TREASURY_FUNDING_NOT_APPROVED") {
    issue("review.status", `Unexpected review status: ${review.status}`);
  }

  if (review.globalTreasuryFundingApprovalReviewComplete !== true || review.readyForGlobalTreasuryFundingApproval !== true) {
    issue("review.readinessFlags", "Review must show complete and ready for global treasury funding approval.");
  }

  if (review.fullLaunchLive !== true || review.fullLaunchApproved !== true || review.buyPageActivated !== true || review.publicTradingLive !== true) {
    issue("review.launchFlags", "Review must show full launch live, approved, buy page activated, and public trading live.");
  }

  if (review.treasuryFundingApproved !== false || review.treasuryFundingExecuted !== false || review.fundsMoved !== false) {
    issue("review.fundingFlags", "Review must show treasury funding not approved/executed and funds not moved.");
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

  if (fullLaunchLiveStatus.status !== "FULL_LAUNCH_LIVE_PUBLIC_FINALIZATION_RECORDED_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED") {
    issue("fullLaunchLiveStatus.status", "Full launch live public status must be complete.");
  }

  if (fullLaunchLive.fullLaunchLive !== true || fullLaunchLive.fullLaunchApproved !== true) {
    issue("fullLaunchLive.flags", "Full launch live record must show live and approved.");
  }

  if (fullLaunchStatus.fullLaunchLive !== true || fullLaunchStatus.fullLaunchApproved !== true) {
    issue("fullLaunchStatus.flags", "Full launch status must show live and approved.");
  }

  if (postVerification.liquidityPostExecutionVerified !== true || postVerification.liquidityAdded !== true || postVerification.positionMinted !== true) {
    issue("postVerification.flags", "Post-execution verification must be complete.");
  }

  const treasuryFundingApproved = boolValue(
    treasuryFunding.treasuryFundingApproved,
    treasuryFunding.summary?.treasuryFundingApproved,
    treasuryFunding.globalTreasuryFundingApproved,
    treasuryFunding.summary?.globalTreasuryFundingApproved,
    fullLaunchStatus.treasuryFundingApproved
  );

  const treasuryFundingExecuted = boolValue(
    treasuryFunding.treasuryFundingExecuted,
    treasuryFunding.summary?.treasuryFundingExecuted,
    treasuryFunding.globalTreasuryFundingExecuted,
    treasuryFunding.summary?.globalTreasuryFundingExecuted,
    fullLaunchStatus.treasuryFundingExecuted
  );

  if (treasuryFundingApproved !== false) {
    issue("treasuryFundingApproved", "Treasury funding must remain not approved.");
  }

  if (treasuryFundingExecuted !== false) {
    issue("treasuryFundingExecuted", "Treasury funding must remain not executed.");
  }
}

const result = {
  schema: "astra-global-treasury-funding-approval-review-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  reviewFile: reviewRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
