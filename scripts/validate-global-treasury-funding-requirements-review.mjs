import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const reviewRelativePath = "reports/global-treasury-funding-requirements-review/global-treasury-funding-requirements-review.json";

const requiredFiles = [
  "configs/global-treasury-funding-requirements-review.config.json",
  "docs/global-treasury-funding-requirements-review/GLOBAL_TREASURY_FUNDING_REQUIREMENTS_REVIEW.md",
  "docs/global-treasury-funding-requirements-review/GLOBAL_TREASURY_FUNDING_REQUIREMENTS_REVIEW_CHECKLIST.md",
  "docs/global-treasury-funding-requirements-review/GLOBAL_TREASURY_FUNDING_REQUIREMENTS_REVIEW_BOUNDARIES.md",
  "docs/global-treasury-funding-requirements-review/GLOBAL_TREASURY_FUNDING_REQUIREMENTS_REVIEW_RUNBOOK.md",
  "scripts/review-global-treasury-funding-requirements.mjs",
  reviewRelativePath,
  "public-docs/global-treasury-funding-approval-status.json",
  "reports/global-treasury-funding-approval/global-treasury-funding-approval-record.json",
  "public-docs/global-treasury-funding-approved-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/full-launch-live-status.json",
  "reports/full-launch-live/full-launch-live-record.json",
  "public-docs/dex-liquidity-post-execution-verification-status.json",
  "reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json"
];

const forbiddenFiles = [
  "reports/global-treasury-funding/payload/global-treasury-funding-safe-payload.json",
  "reports/global-treasury-funding/safe-submission/global-treasury-funding-safe-submission.json",
  "reports/global-treasury-funding/live/global-treasury-funding-executed.json",
  "reports/treasury-funding/live/treasury-funding-executed.json",
  "reports/treasury-funding/live/funds-moved.json",
  "public-docs/global-treasury-funding-payload-status.json",
  "public-docs/global-treasury-funding-live-status.json",
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
    issue(file, "Missing required global treasury funding requirements review file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden funding payload/submission/execution/fund-movement artifact exists.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/global-treasury-funding-requirements-review.config.json");
  const review = readJson(reviewRelativePath);
  const approvalStatus = readJson("public-docs/global-treasury-funding-approval-status.json");
  const approval = readJson("reports/global-treasury-funding-approval/global-treasury-funding-approval-record.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const fullLaunchStatus = readJson("public-docs/full-launch-status.json");
  const fullLaunchLive = readJson("reports/full-launch-live/full-launch-live-record.json");
  const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");

  if (config.reviewOnly !== true) {
    issue("config.reviewOnly", "Config must be review-only.");
  }

  if (config.globalTreasuryFundingRequirementsReviewComplete !== true || config.readyForGlobalTreasuryFundingPayloadGenerationApproval !== true) {
    issue("config.readinessFlags", "Config must show requirements review complete and ready for payload generation approval.");
  }

  if (review.status !== "GLOBAL_TREASURY_FUNDING_REQUIREMENTS_REVIEW_COMPLETE_APPROVED_NO_PAYLOAD_NO_FUNDS_MOVED") {
    issue("review.status", `Unexpected requirements review status: ${review.status}`);
  }

  if (review.globalTreasuryFundingRequirementsReviewComplete !== true || review.readyForGlobalTreasuryFundingPayloadGenerationApproval !== true) {
    issue("review.readinessFlags", "Review must show complete and ready for payload generation approval.");
  }

  if (review.globalTreasuryFundingApproved !== true || review.treasuryFundingApproved !== true) {
    issue("review.approvalFlags", "Review must show global treasury funding approved.");
  }

  if (review.treasuryFundingExecuted !== false || review.fundingPayloadGenerated !== false || review.safeTransactionSubmitted !== false || review.fundsMoved !== false) {
    issue("review.noExecutionFlags", "Review must show no payload, no Safe submission, no execution, and no fund movement.");
  }

  if (review.fullLaunchLive !== true || review.fullLaunchApproved !== true) {
    issue("review.fullLaunchFlags", "Review must show full launch live and approved.");
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

  if (approvalStatus.status !== "GLOBAL_TREASURY_FUNDING_APPROVED_FULL_LAUNCH_LIVE_NO_PAYLOAD_NO_FUNDS_MOVED") {
    issue("approvalStatus.status", "Global treasury funding approval must be complete.");
  }

  if (approval.globalTreasuryFundingApproved !== true || approval.treasuryFundingApproved !== true) {
    issue("approval.flags", "Approval record must show treasury funding approved.");
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

  if (treasuryFundingApproved !== true) {
    issue("treasuryFundingApproved", "Treasury funding must be approved.");
  }

  if (treasuryFundingExecuted !== false) {
    issue("treasuryFundingExecuted", "Treasury funding must remain not executed.");
  }

  if (fullLaunchLive.fullLaunchLive !== true || fullLaunchLive.fullLaunchApproved !== true) {
    issue("fullLaunchLive.flags", "Full launch must be live and approved.");
  }

  if (postVerification.liquidityPostExecutionVerified !== true || postVerification.liquidityAdded !== true || postVerification.positionMinted !== true) {
    issue("postVerification.flags", "Post-execution liquidity verification must be complete.");
  }
}

const result = {
  schema: "astra-global-treasury-funding-requirements-review-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  reviewFile: reviewRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
