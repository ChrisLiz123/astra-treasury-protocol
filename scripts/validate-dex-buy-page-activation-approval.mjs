import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-buy-page-activation-approval/dex-buy-page-activation-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const requiredFiles = [
  "configs/dex-buy-page-activation-approval.config.json",
  "docs/dex-buy-page-activation-approval/DEX_BUY_PAGE_ACTIVATION_APPROVAL.md",
  "docs/dex-buy-page-activation-approval/DEX_BUY_PAGE_ACTIVATION_APPROVAL_CHECKLIST.md",
  "docs/dex-buy-page-activation-approval/DEX_BUY_PAGE_ACTIVATION_APPROVAL_BOUNDARIES.md",
  "docs/dex-buy-page-activation-approval/DEX_BUY_PAGE_ACTIVATION_APPROVAL_RUNBOOK.md",
  "scripts/record-dex-buy-page-activation-approval.mjs",
  "public-docs/dex-public-trading-link-approval-status.json",
  "reports/dex-public-trading-link-approval/dex-public-trading-link-approval-record.json",
  "public-docs/dex-public-trading-approval-status.json",
  "reports/dex-public-trading-approval/dex-public-trading-approval-record.json",
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
  "public-docs/dex-buy-page-activated-status.json",
  "public-docs/dex-buy-page-activation-live-status.json",
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
    issue(file, "Missing required DEX buy page activation approval file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden buy-page-live/full-launch artifact exists.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-buy-page-activation-approval.config.json");
  const approvalRecordPresent = fs.existsSync(recordPath);

  const linkApprovalStatus = readJson("public-docs/dex-public-trading-link-approval-status.json");
  const linkApproval = readJson("reports/dex-public-trading-link-approval/dex-public-trading-link-approval-record.json");
  const tradingApprovalStatus = readJson("public-docs/dex-public-trading-approval-status.json");
  const tradingApproval = readJson("reports/dex-public-trading-approval/dex-public-trading-approval-record.json");
  const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");
  const executionLive = readJson("reports/dex-liquidity-safe-execution-live/dex-liquidity-safe-execution-live-record.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");

  if (config.approvalPrepared !== true || config.approvalOnly !== true) {
    issue("config", "Config must be prepared and approval-only.");
  }

  if (config.buyPageActivationApprovalRecorded !== approvalRecordPresent) {
    issue("config.buyPageActivationApprovalRecorded", "Config buy page activation approval flag must match record presence.");
  }

  if (config.buyPageActivationApproved !== approvalRecordPresent) {
    issue("config.buyPageActivationApproved", "Config buy page activation approval flag must be true only after record exists.");
  }

  if (config.buyPageActivated !== false || config.fullLaunchApproved !== false) {
    issue("config.hardStops", "Buy page activated and full launch approved must remain false.");
  }

  if (linkApprovalStatus.status !== "DEX_PUBLIC_TRADING_LINK_APPROVED_PUBLIC_TRADING_APPROVED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED") {
    issue("linkApprovalStatus.status", "Public trading link approval must be recorded.");
  }

  if (linkApproval.publicTradingLinkApproved !== true || linkApproval.publicTradingApproved !== true) {
    issue("linkApproval.flags", "Public trading and public trading link must be approved.");
  }

  if (linkApproval.buyPageActivated !== false || linkApproval.fullLaunchApproved !== false) {
    issue("linkApproval.restrictions", "Buy page and full launch must remain false.");
  }

  if (!isHttpUrl(linkApproval.tradingLinkUrl)) {
    issue("linkApproval.tradingLinkUrl", "Trading link URL must be valid.");
  }

  if (tradingApprovalStatus.status !== "DEX_PUBLIC_TRADING_APPROVED_LIQUIDITY_VERIFIED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED") {
    issue("tradingApprovalStatus.status", "Public trading approval must be recorded.");
  }

  if (tradingApproval.publicTradingApproved !== true) {
    issue("tradingApproval.publicTradingApproved", "Public trading approval must be true.");
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

  if (executionLive.buyPageActivated !== false || executionLive.fullLaunchApproved !== false) {
    issue("executionLive.flags", "Buy page and full launch must remain false.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Global treasury funding must remain not approved/executed.");
  }

  if (capabilityMatrix.allCapabilityApprovalsFalse !== true) {
    issue("capabilityMatrix", "Capability approvals must remain false before buy page live/full launch.");
  }

  if (approvalRecordPresent) {
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));

    if (record.schema !== "astra-dex-buy-page-activation-approval-record-v0.1") {
      issue("record.schema", "Invalid buy page activation approval record schema.");
    }

    if (record.status !== "DEX_BUY_PAGE_ACTIVATION_APPROVED_PUBLIC_TRADING_LINK_APPROVED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED") {
      issue("record.status", "Unexpected buy page activation approval record status.");
    }

    if (record.buyPageActivationApprovalRecorded !== true || record.buyPageActivationApproved !== true) {
      issue("record.approvalFlags", "Approval record must show buy page activation approved/recorded.");
    }

    if (record.buyPageActivated !== false || record.fullLaunchApproved !== false) {
      issue("record.restrictions", "Buy page activated and full launch approved must remain false.");
    }

    if (record.publicTradingApproved !== true || record.publicTradingLinkApproved !== true) {
      issue("record.publicTradingFlags", "Public trading and public trading link must be approved.");
    }

    if (!isHttpUrl(record.approvedBuyPageUrl) || !isHttpUrl(record.tradingLinkUrl)) {
      issue("record.urls", "Approved buy page URL and trading link URL must be valid.");
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
  schema: "astra-dex-buy-page-activation-approval-validation-v0.1",
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
