import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/global-treasury-funding-approval/global-treasury-funding-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const requiredFiles = [
  "configs/global-treasury-funding-approval.config.json",
  "docs/global-treasury-funding-approval/GLOBAL_TREASURY_FUNDING_APPROVAL.md",
  "docs/global-treasury-funding-approval/GLOBAL_TREASURY_FUNDING_APPROVAL_CHECKLIST.md",
  "docs/global-treasury-funding-approval/GLOBAL_TREASURY_FUNDING_APPROVAL_BOUNDARIES.md",
  "docs/global-treasury-funding-approval/GLOBAL_TREASURY_FUNDING_APPROVAL_RUNBOOK.md",
  "scripts/record-global-treasury-funding-approval.mjs",
  "public-docs/global-treasury-funding-approval-review-status.json",
  "reports/global-treasury-funding-approval-review/global-treasury-funding-approval-review.json",
  "public-docs/full-launch-live-status.json",
  "reports/full-launch-live/full-launch-live-record.json",
  "public-docs/full-launch-status.json",
  "public-docs/dex-liquidity-post-execution-verification-status.json",
  "reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json",
  "public-docs/treasury-funding-status.json"
];

const forbiddenFiles = [
  "reports/global-treasury-funding/payload/global-treasury-funding-safe-payload.json",
  "reports/global-treasury-funding/live/global-treasury-funding-executed.json",
  "reports/treasury-funding/live/treasury-funding-executed.json",
  "reports/treasury-funding/live/funds-moved.json",
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
    issue(file, "Missing required global treasury funding approval file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden funding payload/execution/fund-movement artifact exists.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/global-treasury-funding-approval.config.json");
  const approvalRecordPresent = fs.existsSync(recordPath);

  const reviewStatus = readJson("public-docs/global-treasury-funding-approval-review-status.json");
  const review = readJson("reports/global-treasury-funding-approval-review/global-treasury-funding-approval-review.json");
  const fullLaunchLiveStatus = readJson("public-docs/full-launch-live-status.json");
  const fullLaunchLive = readJson("reports/full-launch-live/full-launch-live-record.json");
  const fullLaunchStatus = readJson("public-docs/full-launch-status.json");
  const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");

  if (config.approvalPrepared !== true || config.approvalOnly !== true) {
    issue("config", "Config must be prepared and approval-only.");
  }

  if (config.globalTreasuryFundingApprovalRecorded !== approvalRecordPresent) {
    issue("config.globalTreasuryFundingApprovalRecorded", "Config approval flag must match record presence.");
  }

  if (config.globalTreasuryFundingApproved !== approvalRecordPresent) {
    issue("config.globalTreasuryFundingApproved", "Config funding approval flag must be true only after record exists.");
  }

  if (config.treasuryFundingExecuted !== false || config.fundingPayloadGenerated !== false || config.fundsMoved !== false) {
    issue("config.hardStops", "Funding execution, payload generation, and fund movement must remain false.");
  }

  if (reviewStatus.status !== "GLOBAL_TREASURY_FUNDING_APPROVAL_REVIEW_COMPLETE_FULL_LAUNCH_LIVE_TREASURY_FUNDING_NOT_APPROVED") {
    issue("reviewStatus.status", "Global treasury funding approval review must be complete.");
  }

  if (review.globalTreasuryFundingApprovalReviewComplete !== true || review.readyForGlobalTreasuryFundingApproval !== true) {
    issue("review.flags", "Review must show ready for global treasury funding approval.");
  }

  if (fullLaunchLiveStatus.status !== "FULL_LAUNCH_LIVE_PUBLIC_FINALIZATION_RECORDED_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED") {
    issue("fullLaunchLiveStatus.status", "Full launch live status must be complete.");
  }

  if (fullLaunchLive.fullLaunchLive !== true || fullLaunchLive.fullLaunchApproved !== true) {
    issue("fullLaunchLive.flags", "Full launch must be live and approved.");
  }

  if (postVerification.liquidityPostExecutionVerified !== true || postVerification.liquidityAdded !== true || postVerification.positionMinted !== true) {
    issue("postVerification.flags", "Post-execution liquidity verification must be complete.");
  }

  if (!sameAddress(postVerification.positionOwnerLive, postVerification.liquiditySafeAddress)) {
    issue("postVerification.positionOwnerLive", "Position owner must be liquidity Safe.");
  }

  if (approvalRecordPresent) {
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));

    if (record.schema !== "astra-global-treasury-funding-approval-record-v0.1") {
      issue("record.schema", "Invalid global treasury funding approval record schema.");
    }

    if (record.status !== "GLOBAL_TREASURY_FUNDING_APPROVED_FULL_LAUNCH_LIVE_NO_PAYLOAD_NO_FUNDS_MOVED") {
      issue("record.status", "Unexpected global treasury funding approval record status.");
    }

    if (record.globalTreasuryFundingApprovalRecorded !== true || record.globalTreasuryFundingApproved !== true || record.treasuryFundingApproved !== true) {
      issue("record.approvalFlags", "Record must show global treasury funding approved/recorded.");
    }

    if (record.treasuryFundingExecuted !== false || record.fundingPayloadGenerated !== false || record.fundsMoved !== false) {
      issue("record.noExecutionFlags", "Funding execution, payload generation, and funds moved must remain false.");
    }

    if (!isAddress(record.liquiditySafeAddress) || !isTxHash(record.executionTxHash)) {
      issue("record.identifiers", "Liquidity Safe and execution tx hash must be valid.");
    }

    if (record.executionTxHash !== postVerification.executionTxHash) {
      issue("record.executionTxHash", "Record execution tx hash must match liquidity verification.");
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
      issue("treasuryFundingApproved", "Treasury funding status must show approved after record exists.");
    }

    if (treasuryFundingExecuted !== false) {
      issue("treasuryFundingExecuted", "Treasury funding must remain not executed.");
    }

    if (fullLaunchStatus.treasuryFundingApproved !== true || fullLaunchStatus.treasuryFundingExecuted !== false) {
      issue("fullLaunchStatus.treasuryFunding", "Full launch status must show treasury funding approved but not executed.");
    }
  } else {
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
      issue("treasuryFundingApproved", "Treasury funding must not be approved before approval record exists.");
    }

    if (treasuryFundingExecuted !== false) {
      issue("treasuryFundingExecuted", "Treasury funding must not be executed before approval record exists.");
    }
  }
}

const result = {
  schema: "astra-global-treasury-funding-approval-validation-v0.1",
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
