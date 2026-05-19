import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/full-launch-live/full-launch-live-record.json";
const liveEvidenceRelativePath = "reports/full-launch/live/full-launch-live.json";

const requiredFiles = [
  "configs/full-launch-live.config.json",
  "docs/full-launch-live/FULL_LAUNCH_LIVE.md",
  "docs/full-launch-live/FULL_LAUNCH_LIVE_CHECKLIST.md",
  "docs/full-launch-live/FULL_LAUNCH_LIVE_BOUNDARIES.md",
  "docs/full-launch-live/FULL_LAUNCH_LIVE_RUNBOOK.md",
  "scripts/record-full-launch-live.mjs",
  recordRelativePath,
  liveEvidenceRelativePath,
  "public-docs/full-launch-approval-status.json",
  "reports/full-launch-approval/full-launch-approval-record.json",
  "public-docs/full-launch-approved-status.json",
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
  "public-docs/buy.html",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json"
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
    issue(file, "Missing required full launch live file.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/full-launch-live.config.json");
  const record = readJson(recordRelativePath);
  const liveEvidence = readJson(liveEvidenceRelativePath);
  const approvalStatus = readJson("public-docs/full-launch-approval-status.json");
  const approval = readJson("reports/full-launch-approval/full-launch-approval-record.json");
  const fullLaunchStatus = readJson("public-docs/full-launch-status.json");
  const buyActivation = readJson("reports/dex-buy-page-activation-live/dex-buy-page-activation-live-record.json");
  const publicTradingLive = readJson("reports/dex-public-trading/live/public-trading-live.json");
  const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");

  if (config.publicFinalizationOnly !== true) {
    issue("config.publicFinalizationOnly", "Config must be public-finalization-only.");
  }

  if (config.fullLaunchLiveRecorded !== true || config.fullLaunchLive !== true || config.fullLaunchApproved !== true) {
    issue("config.fullLaunchFlags", "Config must show full launch live recorded, live, and approved.");
  }

  if (record.status !== "FULL_LAUNCH_LIVE_PUBLIC_FINALIZATION_RECORDED_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED") {
    issue("record.status", `Unexpected full launch live status: ${record.status}`);
  }

  if (record.fullLaunchLiveRecorded !== true || record.fullLaunchLive !== true || record.fullLaunchApproved !== true) {
    issue("record.fullLaunchFlags", "Record must show full launch live recorded/live/approved.");
  }

  if (record.treasuryFundingApproved !== false || record.treasuryFundingExecuted !== false) {
    issue("record.treasuryFunding", "Global treasury funding must remain not approved/executed.");
  }

  if (!isHttpUrl(record.launchPageUrl) || !isHttpUrl(record.buyPageUrl) || !isHttpUrl(record.tradingLinkUrl)) {
    issue("record.urls", "Launch, buy, and trading URLs must be valid.");
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

  if (liveEvidence.status !== "FULL_LAUNCH_LIVE_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED") {
    issue("liveEvidence.status", "Live evidence must show full launch live.");
  }

  if (liveEvidence.fullLaunchLive !== true || liveEvidence.treasuryFundingApproved !== false || liveEvidence.treasuryFundingExecuted !== false) {
    issue("liveEvidence.flags", "Live evidence must show full launch live and treasury funding false.");
  }

  if (approvalStatus.status !== "FULL_LAUNCH_APPROVED_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED") {
    issue("approvalStatus.status", "Full launch approval must be recorded.");
  }

  if (approval.fullLaunchApproved !== true) {
    issue("approval.fullLaunchApproved", "Full launch approval record must show approved.");
  }

  if (buyActivation.buyPageActivated !== true || buyActivation.publicTradingLive !== true) {
    issue("buyActivation.flags", "Buy page must be active and public trading live.");
  }

  if (publicTradingLive.publicTradingLive !== true || publicTradingLive.buyPageActivated !== true) {
    issue("publicTradingLive.flags", "Public trading live artifact must show public trading live and buy page activated.");
  }

  if (postVerification.liquidityPostExecutionVerified !== true || postVerification.liquidityAdded !== true || postVerification.positionMinted !== true) {
    issue("postVerification.flags", "Post-execution liquidity verification must be complete.");
  }

  if (fullLaunchStatus.status !== "FULL_LAUNCH_LIVE_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED") {
    issue("fullLaunchStatus.status", "Full launch status must show full launch live.");
  }

  if (fullLaunchStatus.fullLaunchLive !== true || fullLaunchStatus.fullLaunchApproved !== true) {
    issue("fullLaunchStatus.flags", "Full launch status must show approved and live.");
  }

  if (fullLaunchStatus.treasuryFundingApproved !== false || fullLaunchStatus.treasuryFundingExecuted !== false) {
    issue("fullLaunchStatus.treasuryFunding", "Full launch status must show treasury funding not approved/executed.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Global treasury funding must remain not approved/executed.");
  }
}

const result = {
  schema: "astra-full-launch-live-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  recordFile: recordRelativePath,
  liveEvidenceFile: liveEvidenceRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
