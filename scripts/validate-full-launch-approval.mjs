import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/full-launch-approval/full-launch-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const requiredFiles = [
  "configs/full-launch-approval.config.json",
  "docs/full-launch-approval/FULL_LAUNCH_APPROVAL.md",
  "docs/full-launch-approval/FULL_LAUNCH_APPROVAL_CHECKLIST.md",
  "docs/full-launch-approval/FULL_LAUNCH_APPROVAL_BOUNDARIES.md",
  "docs/full-launch-approval/FULL_LAUNCH_APPROVAL_RUNBOOK.md",
  "scripts/record-full-launch-approval.mjs",
  "public-docs/full-launch-readiness-review-status.json",
  "reports/full-launch-readiness-review/full-launch-readiness-review.json",
  "public-docs/dex-buy-page-activation-live-status.json",
  "reports/dex-buy-page-activation-live/dex-buy-page-activation-live-record.json",
  "public-docs/dex-public-trading-live-status.json",
  "reports/dex-public-trading/live/public-trading-live.json",
  "public-docs/dex-buy-page-activated-status.json",
  "reports/dex-buy-page/live/buy-page-activated.json",
  "public-docs/dex-liquidity-post-execution-verification-status.json",
  "reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/buy.html",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json"
];

const forbiddenFiles = [
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
    issue(file, "Missing required full launch approval file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden full-launch-live artifact exists.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/full-launch-approval.config.json");
  const approvalRecordPresent = fs.existsSync(recordPath);

  const readinessStatus = readJson("public-docs/full-launch-readiness-review-status.json");
  const readiness = readJson("reports/full-launch-readiness-review/full-launch-readiness-review.json");
  const buyActivation = readJson("reports/dex-buy-page-activation-live/dex-buy-page-activation-live-record.json");
  const publicTradingLive = readJson("reports/dex-public-trading/live/public-trading-live.json");
  const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");

  if (config.approvalPrepared !== true || config.approvalOnly !== true) {
    issue("config", "Config must be prepared and approval-only.");
  }

  if (config.fullLaunchApprovalRecorded !== approvalRecordPresent) {
    issue("config.fullLaunchApprovalRecorded", "Config full launch approval flag must match record presence.");
  }

  if (config.fullLaunchApproved !== approvalRecordPresent) {
    issue("config.fullLaunchApproved", "Config full launch approved flag must be true only after record exists.");
  }

  if (config.treasuryFundingApproved !== false || config.treasuryFundingExecuted !== false) {
    issue("config.treasuryFunding", "Global treasury funding must remain not approved/executed.");
  }

  if (readinessStatus.status !== "FULL_LAUNCH_READINESS_REVIEW_COMPLETE_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED") {
    issue("readinessStatus.status", "Full launch readiness review must be complete.");
  }

  if (readiness.fullLaunchReadinessReviewComplete !== true || readiness.readyForFullLaunchApproval !== true) {
    issue("readiness.flags", "Readiness review must show ready for full launch approval.");
  }

  if (buyActivation.buyPageActivated !== true || buyActivation.publicTradingLive !== true) {
    issue("buyActivation.flags", "Buy page must be activated and public trading live.");
  }

  if (publicTradingLive.publicTradingLive !== true || publicTradingLive.buyPageActivated !== true) {
    issue("publicTradingLive.flags", "Public trading live artifact must show live/activated.");
  }

  if (!isHttpUrl(buyActivation.buyPageUrl) || !isHttpUrl(buyActivation.tradingLinkUrl)) {
    issue("buyActivation.urls", "Buy page URL and trading link URL must be valid.");
  }

  if (postVerification.liquidityPostExecutionVerified !== true || postVerification.liquidityAdded !== true || postVerification.positionMinted !== true) {
    issue("postVerification.flags", "Liquidity post-execution verification must be complete.");
  }

  if (BigInt(String(postVerification.poolLiquidityLive || "0")) <= 0n) {
    issue("postVerification.poolLiquidityLive", "Pool liquidity must be greater than zero.");
  }

  if (!sameAddress(postVerification.positionOwnerLive, postVerification.liquiditySafeAddress)) {
    issue("postVerification.positionOwnerLive", "Position owner must be liquidity Safe.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Global treasury funding must remain not approved/executed.");
  }

  if (approvalRecordPresent) {
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));

    if (record.schema !== "astra-full-launch-approval-record-v0.1") {
      issue("record.schema", "Invalid full launch approval record schema.");
    }

    if (record.status !== "FULL_LAUNCH_APPROVED_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED") {
      issue("record.status", "Unexpected full launch approval record status.");
    }

    if (record.fullLaunchApprovalRecorded !== true || record.fullLaunchApproved !== true) {
      issue("record.approvalFlags", "Record must show full launch approved/recorded.");
    }

    if (record.fullLaunchLive !== false) {
      issue("record.fullLaunchLive", "Full launch live finalization must remain false in this milestone.");
    }

    if (record.treasuryFundingApproved !== false || record.treasuryFundingExecuted !== false) {
      issue("record.treasuryFunding", "Global treasury funding must remain false.");
    }

    if (!isHttpUrl(record.buyPageUrl) || !isHttpUrl(record.tradingLinkUrl)) {
      issue("record.urls", "Buy page URL and trading link URL must be valid.");
    }

    if (!isAddress(record.liquiditySafeAddress) || !isTxHash(record.executionTxHash)) {
      issue("record.identifiers", "Liquidity Safe and execution tx hash must be valid.");
    }

    if (record.executionTxHash !== postVerification.executionTxHash) {
      issue("record.executionTxHash", "Record execution tx hash must match post-execution verification.");
    }

    if (BigInt(String(record.poolLiquidityLive || "0")) <= 0n) {
      issue("record.poolLiquidityLive", "Record pool liquidity must be greater than zero.");
    }

    if (!sameAddress(record.positionOwnerLive, record.liquiditySafeAddress)) {
      issue("record.positionOwnerLive", "Record position owner must be liquidity Safe.");
    }

    if (fullLaunch.fullLaunchApproved !== true || fullLaunch.fullLaunchApprovalRecorded !== true) {
      issue("fullLaunch.status", "Full launch status must show approval after record exists.");
    }

    if (fullLaunch.treasuryFundingApproved !== false || fullLaunch.treasuryFundingExecuted !== false) {
      issue("fullLaunch.treasuryFunding", "Full launch status must show treasury funding not approved/executed.");
    }
  } else {
    if (fullLaunch.fullLaunchApproved !== false) {
      issue("fullLaunch.fullLaunchApproved", "Full launch must be false before approval record exists.");
    }
  }
}

const result = {
  schema: "astra-full-launch-approval-validation-v0.1",
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
