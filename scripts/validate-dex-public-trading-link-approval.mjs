import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-public-trading-link-approval/dex-public-trading-link-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const requiredFiles = [
  "configs/dex-public-trading-link-approval.config.json",
  "docs/dex-public-trading-link-approval/DEX_PUBLIC_TRADING_LINK_APPROVAL.md",
  "docs/dex-public-trading-link-approval/DEX_PUBLIC_TRADING_LINK_APPROVAL_CHECKLIST.md",
  "docs/dex-public-trading-link-approval/DEX_PUBLIC_TRADING_LINK_APPROVAL_BOUNDARIES.md",
  "docs/dex-public-trading-link-approval/DEX_PUBLIC_TRADING_LINK_APPROVAL_RUNBOOK.md",
  "scripts/record-dex-public-trading-link-approval.mjs",
  "public-docs/dex-public-trading-approval-status.json",
  "reports/dex-public-trading-approval/dex-public-trading-approval-record.json",
  "public-docs/dex-public-trading-readiness-review-status.json",
  "reports/dex-public-trading-readiness-review/dex-public-trading-readiness-review.json",
  "public-docs/dex-liquidity-post-execution-verification-status.json",
  "reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json",
  "public-docs/dex-liquidity-safe-execution-live-status.json",
  "reports/dex-liquidity-safe-execution-live/dex-liquidity-safe-execution-live-record.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json"
];

const forbiddenFiles = [
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

function isHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required DEX public trading link approval file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden public-trading-live/buy-page/full-launch artifact exists.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-public-trading-link-approval.config.json");
  const approvalRecordPresent = fs.existsSync(recordPath);

  const publicTradingApprovalStatus = readJson("public-docs/dex-public-trading-approval-status.json");
  const publicTradingApproval = readJson("reports/dex-public-trading-approval/dex-public-trading-approval-record.json");
  const readinessStatus = readJson("public-docs/dex-public-trading-readiness-review-status.json");
  const readiness = readJson("reports/dex-public-trading-readiness-review/dex-public-trading-readiness-review.json");
  const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");

  if (config.approvalPrepared !== true || config.approvalOnly !== true) {
    issue("config", "Config must be prepared and approval-only.");
  }

  if (config.publicTradingLinkApprovalRecorded !== approvalRecordPresent) {
    issue("config.publicTradingLinkApprovalRecorded", "Config link approval flag must match record presence.");
  }

  if (config.publicTradingLinkApproved !== approvalRecordPresent) {
    issue("config.publicTradingLinkApproved", "Config public trading link approval flag must be true only after record exists.");
  }

  if (config.publicTradingApproved !== true) {
    issue("config.publicTradingApproved", "Public trading policy approval must already be true.");
  }

  if (config.buyPageActivated !== false || config.fullLaunchApproved !== false) {
    issue("config.hardStops", "Buy page and full launch must remain false.");
  }

  if (publicTradingApprovalStatus.status !== "DEX_PUBLIC_TRADING_APPROVED_LIQUIDITY_VERIFIED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED") {
    issue("publicTradingApprovalStatus.status", "Public trading approval must be recorded.");
  }

  if (publicTradingApproval.publicTradingApproved !== true) {
    issue("publicTradingApproval.publicTradingApproved", "Public trading approval record must show public trading approved.");
  }

  if (publicTradingApproval.publicTradingLinkApproved !== false || publicTradingApproval.buyPageActivated !== false || publicTradingApproval.fullLaunchApproved !== false) {
    issue("publicTradingApproval.restrictions", "Public trading link, buy page, and full launch must remain false before link approval.");
  }

  if (!readiness.status || !(readiness.publicTradingReadinessReviewComplete === true || readiness.readyForPublicTradingApproval === true || readiness.readyForPublicTradingApprovalReview === true)) {
    issue("readiness.flags", "Readiness review must be complete.");
  }

  if (postVerification.liquidityPostExecutionVerified !== true || postVerification.liquidityAdded !== true || postVerification.positionMinted !== true) {
    issue("postVerification.flags", "Post-execution verification must show verified, liquidity added, and position minted.");
  }

  if (BigInt(String(postVerification.poolLiquidityLive || "0")) <= 0n) {
    issue("postVerification.poolLiquidityLive", "Pool liquidity must be greater than zero.");
  }

  if (!sameAddress(postVerification.positionOwnerLive, postVerification.liquiditySafeAddress)) {
    issue("postVerification.positionOwnerLive", "Position owner must be liquidity Safe.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Global treasury funding must remain not approved/executed.");
  }

  if (capabilityMatrix.allCapabilityApprovalsFalse !== true) {
    issue("capabilityMatrix", "Capability approvals must remain false before buy page/full launch.");
  }

  if (approvalRecordPresent) {
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));

    if (record.schema !== "astra-dex-public-trading-link-approval-record-v0.1") {
      issue("record.schema", "Invalid public trading link approval record schema.");
    }

    if (record.status !== "DEX_PUBLIC_TRADING_LINK_APPROVED_PUBLIC_TRADING_APPROVED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED") {
      issue("record.status", "Unexpected public trading link approval record status.");
    }

    if (record.publicTradingLinkApprovalRecorded !== true || record.publicTradingLinkApproved !== true || record.publicTradingApproved !== true) {
      issue("record.approvalFlags", "Approval record must show public trading and public trading link approved.");
    }

    if (record.publicTradingLive !== false || record.buyPageActivated !== false || record.fullLaunchApproved !== false) {
      issue("record.restrictions", "Public trading live, buy page, and full launch must remain false.");
    }

    if (!isHttpUrl(record.tradingLinkUrl)) {
      issue("record.tradingLinkUrl", "Trading link URL must be valid.");
    }

    if (!isAddress(record.liquiditySafeAddress) || !isTxHash(record.executionTxHash)) {
      issue("record.identifiers", "Record liquidity Safe and execution tx hash must be valid.");
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
  }
}

const result = {
  schema: "astra-dex-public-trading-link-approval-validation-v0.1",
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
