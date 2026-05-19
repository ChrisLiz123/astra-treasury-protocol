import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-buy-page-activation-live/dex-buy-page-activation-live-record.json";
const buyPageActivatedRelativePath = "reports/dex-buy-page/live/buy-page-activated.json";
const publicTradingLiveRelativePath = "reports/dex-public-trading/live/public-trading-live.json";

const requiredFiles = [
  "configs/dex-buy-page-activation-live.config.json",
  "docs/dex-buy-page-activation-live/DEX_BUY_PAGE_ACTIVATION_LIVE.md",
  "docs/dex-buy-page-activation-live/DEX_BUY_PAGE_ACTIVATION_LIVE_CHECKLIST.md",
  "docs/dex-buy-page-activation-live/DEX_BUY_PAGE_ACTIVATION_LIVE_BOUNDARIES.md",
  "docs/dex-buy-page-activation-live/DEX_BUY_PAGE_ACTIVATION_LIVE_RUNBOOK.md",
  "scripts/record-dex-buy-page-activation-live.mjs",
  recordRelativePath,
  buyPageActivatedRelativePath,
  publicTradingLiveRelativePath,
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
    issue(file, "Missing required DEX buy page activation live file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden full-launch artifact exists.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-buy-page-activation-live.config.json");
  const record = readJson(recordRelativePath);
  const buyPageActivated = readJson(buyPageActivatedRelativePath);
  const publicTradingLive = readJson(publicTradingLiveRelativePath);
  const activationApprovalStatus = readJson("public-docs/dex-buy-page-activation-approval-status.json");
  const activationApproval = readJson("reports/dex-buy-page-activation-approval/dex-buy-page-activation-approval-record.json");
  const linkApproval = readJson("reports/dex-public-trading-link-approval/dex-public-trading-link-approval-record.json");
  const tradingApproval = readJson("reports/dex-public-trading-approval/dex-public-trading-approval-record.json");
  const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");

  if (config.activationLiveEvidenceOnly !== true) {
    issue("config.activationLiveEvidenceOnly", "Config must be activation-live evidence only.");
  }

  if (config.buyPageActivationLiveRecorded !== true || config.buyPageActivated !== true || config.publicTradingLive !== true) {
    issue("config.activationFlags", "Config must show buy page activation live, buy page activated, and public trading live.");
  }

  if (record.status !== "DEX_BUY_PAGE_ACTIVATION_LIVE_RECORDED_BUY_PAGE_ACTIVATED_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED") {
    issue("record.status", `Unexpected activation live status: ${record.status}`);
  }

  if (record.buyPageActivationLiveRecorded !== true || record.buyPageActivated !== true || record.publicTradingLive !== true) {
    issue("record.activationFlags", "Record must show buy page activated and public trading live.");
  }

  if (!isHttpUrl(record.buyPageUrl) || !isHttpUrl(record.tradingLinkUrl)) {
    issue("record.urls", "Buy page URL and trading link URL must be valid.");
  }

  if (!isAddress(record.liquiditySafeAddress) || !isTxHash(record.executionTxHash)) {
    issue("record.identifiers", "Liquidity Safe and execution tx hash must be valid.");
  }

  if (BigInt(String(record.poolLiquidityLive || "0")) <= 0n) {
    issue("record.poolLiquidityLive", "Pool liquidity must be greater than zero.");
  }

  if (!sameAddress(record.positionOwnerLive, record.liquiditySafeAddress)) {
    issue("record.positionOwnerLive", "Position owner must be liquidity Safe.");
  }

  if (record.fullLaunchApproved !== false) {
    issue("record.fullLaunchApproved", "Full launch must remain false.");
  }

  if (buyPageActivated.status !== "DEX_BUY_PAGE_ACTIVATED_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED" || buyPageActivated.buyPageActivated !== true) {
    issue("buyPageActivated.status", "Buy-page activated artifact must show buy page activated.");
  }

  if (publicTradingLive.status !== "DEX_PUBLIC_TRADING_LIVE_BUY_PAGE_ACTIVATED_FULL_LAUNCH_NOT_APPROVED" || publicTradingLive.publicTradingLive !== true) {
    issue("publicTradingLive.status", "Public trading live artifact must show public trading live.");
  }

  if (activationApprovalStatus.status !== "DEX_BUY_PAGE_ACTIVATION_APPROVED_PUBLIC_TRADING_LINK_APPROVED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED") {
    issue("activationApprovalStatus.status", "Buy page activation approval must be recorded.");
  }

  if (activationApproval.buyPageActivationApproved !== true) {
    issue("activationApproval.buyPageActivationApproved", "Buy page activation approval must be true.");
  }

  if (linkApproval.publicTradingLinkApproved !== true || tradingApproval.publicTradingApproved !== true) {
    issue("publicTradingApprovals", "Public trading and public trading link must be approved.");
  }

  if (postVerification.liquidityPostExecutionVerified !== true || postVerification.liquidityAdded !== true || postVerification.positionMinted !== true) {
    issue("postVerification.flags", "Post-execution verification must show verified, liquidity added, and position minted.");
  }

  if (record.executionTxHash !== postVerification.executionTxHash) {
    issue("record.executionTxHash", "Record execution tx hash must match post-execution verification.");
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
  schema: "astra-dex-buy-page-activation-live-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  recordFile: recordRelativePath,
  buyPageActivatedFile: buyPageActivatedRelativePath,
  publicTradingLiveFile: publicTradingLiveRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
