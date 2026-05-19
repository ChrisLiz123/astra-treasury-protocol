import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const confirm = process.env.FULL_LAUNCH_LIVE_CONFIRM || "";
const finalizedBy = process.env.FULL_LAUNCH_FINALIZED_BY || "";
const finalizationReference = process.env.FULL_LAUNCH_FINALIZATION_REFERENCE || "";
const overwrite = process.env.OVERWRITE_FULL_LAUNCH_LIVE || "";

const requiredConfirm = "FINALIZE_FULL_LAUNCH_LIVE_NO_GLOBAL_TREASURY_FUNDING";

const reportDir = path.join(root, "reports", "full-launch-live");
const recordFile = path.join(reportDir, "full-launch-live-record.json");
const liveEvidenceFile = path.join(root, "reports", "full-launch", "live", "full-launch-live.json");
const configFile = path.join(root, "configs", "full-launch-live.config.json");
const fullLaunchStatusFile = path.join(root, "public-docs", "full-launch-status.json");

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath, fallback = undefined) {
  const full = path.join(root, relativePath);

  if (!fs.existsSync(full)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required file: ${relativePath}`);
  }

  return JSON.parse(fs.readFileSync(full, "utf8"));
}

function readJsonPath(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value, null, 2) + "\n").digest("hex");
}

function readRuntimeEnvValue(key) {
  const runtimeFile = path.join(root, ".runtime", "mainnet-monitor.env");

  if (!fs.existsSync(runtimeFile)) return "";

  for (const line of fs.readFileSync(runtimeFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [rawKey, ...rest] = trimmed.split("=");
    if (rawKey.trim() === key) return rest.join("=").trim().replace(/^["']|["']$/g, "");
  }

  return "";
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

function isPlaceholder(value) {
  const normalized = String(value || "").trim().toLowerCase();

  return (
    normalized.length === 0 ||
    normalized === "tbd" ||
    normalized.includes("tbd") ||
    normalized.includes("todo") ||
    normalized.includes("placeholder") ||
    normalized.includes("replace_with") ||
    normalized.includes("paste_") ||
    normalized === "yyyy-mm-ddthh:mm:ssz"
  );
}

function looksSensitive(value) {
  const normalized = String(value || "").toLowerCase();

  return (
    normalized.includes("private key") ||
    normalized.includes("seed phrase") ||
    normalized.includes("mnemonic") ||
    normalized.includes("password") ||
    normalized.includes("secret")
  );
}

function requireUsable(name, value) {
  if (isPlaceholder(value)) {
    issue(name, "Required value is missing or still a placeholder.");
  }

  if (looksSensitive(value)) {
    issue(name, "Value appears to contain sensitive material.");
  }
}

function encodeUint256(value) {
  const n = BigInt(String(value));
  return n.toString(16).padStart(64, "0");
}

function decodeUint(value) {
  const clean = String(value || "").replace(/^0x/i, "").padStart(64, "0");
  return BigInt(`0x${clean}`);
}

function decodeAddressFromWord(word) {
  return `0x${String(word || "").replace(/^0x/i, "").padStart(64, "0").slice(-40)}`;
}

async function rpcCall(rpcUrl, method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({jsonrpc: "2.0", id: 1, method, params})
  });

  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);

  const body = await response.json();

  if (body.error) throw new Error(body.error.message || JSON.stringify(body.error));

  return body.result;
}

async function readPoolLiquidity(rpcUrl, poolAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: poolAddress, data: "0x1a686502"},
    "latest"
  ]);

  return decodeUint(result).toString();
}

async function readOwnerOf(rpcUrl, nftAddress, tokenId) {
  const data = "0x6352211e" + encodeUint256(tokenId);
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: nftAddress, data},
    "latest"
  ]);

  return decodeAddressFromWord(result);
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

if (confirm !== requiredConfirm) {
  issue("FULL_LAUNCH_LIVE_CONFIRM", `Must equal ${requiredConfirm}.`);
}

requireUsable("FULL_LAUNCH_FINALIZED_BY", finalizedBy);
requireUsable("FULL_LAUNCH_FINALIZATION_REFERENCE", finalizationReference);

if (fs.existsSync(recordFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_FULL_LAUNCH_LIVE",
    "Full launch live record already exists. Set OVERWRITE_FULL_LAUNCH_LIVE=YES only if replacing intentionally."
  );
}

const approvalStatus = readJson("public-docs/full-launch-approval-status.json");
const approval = readJson("reports/full-launch-approval/full-launch-approval-record.json");
const approvedPublicStatus = readJson("public-docs/full-launch-approved-status.json");
const fullLaunchStatus = readJson("public-docs/full-launch-status.json");
const readinessStatus = readJson("public-docs/full-launch-readiness-review-status.json");
const readiness = readJson("reports/full-launch-readiness-review/full-launch-readiness-review.json");
const buyActivationStatus = readJson("public-docs/dex-buy-page-activation-live-status.json");
const buyActivation = readJson("reports/dex-buy-page-activation-live/dex-buy-page-activation-live-record.json");
const publicTradingLiveStatus = readJson("public-docs/dex-public-trading-live-status.json");
const publicTradingLive = readJson("reports/dex-public-trading/live/public-trading-live.json");
const buyPageActivatedStatus = readJson("public-docs/dex-buy-page-activated-status.json");
const buyPageActivated = readJson("reports/dex-buy-page/live/buy-page-activated.json");
const postStatus = readJson("public-docs/dex-liquidity-post-execution-verification-status.json");
const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");
const liquidityAdded = readJson("reports/dex-liquidity-provision/live/liquidity-added.json");
const positionMinted = readJson("reports/dex-liquidity-provision/live/position-minted.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json", {});
const alerts = readJson("public-docs/mainnet-alerts-status.json", {});
const incidents = readJson("public-docs/incident-summary.json", {});

requireStatus("approvalStatus.status", approvalStatus.status, "FULL_LAUNCH_APPROVED_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED");
requireStatus("approval.status", approval.status, "FULL_LAUNCH_APPROVED_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED");
requireStatus("readinessStatus.status", readinessStatus.status, "FULL_LAUNCH_READINESS_REVIEW_COMPLETE_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED");
requireStatus("readiness.status", readiness.status, "FULL_LAUNCH_READINESS_REVIEW_COMPLETE_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED");
requireStatus("buyActivationStatus.status", buyActivationStatus.status, "DEX_BUY_PAGE_ACTIVATION_LIVE_RECORDED_BUY_PAGE_ACTIVATED_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED");
requireStatus("buyActivation.status", buyActivation.status, "DEX_BUY_PAGE_ACTIVATION_LIVE_RECORDED_BUY_PAGE_ACTIVATED_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED");
requireStatus("publicTradingLive.status", publicTradingLive.status, "DEX_PUBLIC_TRADING_LIVE_BUY_PAGE_ACTIVATED_FULL_LAUNCH_NOT_APPROVED");
requireStatus("buyPageActivated.status", buyPageActivated.status, "DEX_BUY_PAGE_ACTIVATED_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED");
requireStatus("postStatus.status", postStatus.status, "DEX_LIQUIDITY_POST_EXECUTION_VERIFIED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("postVerification.status", postVerification.status, "DEX_LIQUIDITY_POST_EXECUTION_VERIFIED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("liquidityAdded.status", liquidityAdded.status, "DEX_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("positionMinted.status", positionMinted.status, "DEX_LIQUIDITY_POSITION_MINTED_NO_PUBLIC_TRADING");

if (approval.fullLaunchApprovalRecorded !== true || approval.fullLaunchApproved !== true) {
  issue("approval.flags", "Full launch approval must be recorded and approved.");
}

if (approval.fullLaunchLive !== false) {
  issue("approval.fullLaunchLive", "Full launch live must not already be finalized in the approval milestone.");
}

if (fullLaunchStatus.fullLaunchApproved !== true || fullLaunchStatus.fullLaunchLive !== false) {
  issue("fullLaunchStatus", "Full launch status must show approved=true and live=false before finalization.");
}

if (approvedPublicStatus.summary?.fullLaunchApproved !== true) {
  issue("approvedPublicStatus.summary.fullLaunchApproved", "Full-launch-approved public status must show approved.");
}

if (buyActivation.buyPageActivated !== true || buyActivation.publicTradingLive !== true) {
  issue("buyActivation.flags", "Buy page must be activated and public trading live.");
}

if (publicTradingLive.publicTradingLive !== true || buyPageActivated.buyPageActivated !== true) {
  issue("publicLiveArtifacts.flags", "Public trading live and buy page activated artifacts must be true.");
}

if (!isHttpUrl(buyActivation.buyPageUrl) || !isHttpUrl(buyActivation.tradingLinkUrl)) {
  issue("buyActivation.urls", "Buy page URL and trading link URL must be valid.");
}

if (!fs.existsSync(path.join(root, "public-docs", "buy.html"))) {
  issue("public-docs/buy.html", "Buy page HTML must exist.");
}

if (postVerification.liquidityPostExecutionVerified !== true || postVerification.liquidityAdded !== true || postVerification.positionMinted !== true) {
  issue("postVerification.flags", "Post-execution verification must show verified, liquidity added, and position minted.");
}

if (!isAddress(postVerification.liquiditySafeAddress) || !isTxHash(postVerification.executionTxHash)) {
  issue("postVerification.identifiers", "Liquidity Safe address and execution tx hash must be valid.");
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

if (monitor.status && monitor.status !== "PASS") {
  issue("monitor.status", `Expected PASS if monitor status is present, got ${monitor.status}.`);
}

if (alerts.responseRequired === true) {
  issue("alerts.responseRequired", "Alerts must not require response.");
}

if (Number(incidents?.summary?.active || 0) !== 0) {
  issue("incidents.summary.active", "Active incidents must be zero.");
}

const rpcUrl =
  process.env.FULL_LAUNCH_LIVE_RPC_URL ||
  process.env.FULL_LAUNCH_APPROVAL_RPC_URL ||
  process.env.FULL_LAUNCH_READINESS_REVIEW_RPC_URL ||
  process.env.DEX_BUY_PAGE_ACTIVATION_LIVE_RPC_URL ||
  process.env.DEX_LIQUIDITY_POST_EXECUTION_VERIFICATION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("FULL_LAUNCH_LIVE_RPC_URL", "RPC URL must be available and start with https://.");
}

let poolLiquidityLive = postVerification.poolLiquidityLive;
let positionOwnerLive = postVerification.positionOwnerLive;

if (issues.length === 0) {
  try {
    poolLiquidityLive = await readPoolLiquidity(rpcUrl, postVerification.poolAddress);

    if (BigInt(String(poolLiquidityLive || "0")) <= 0n) {
      issue("poolLiquidityLive", "Live pool liquidity must remain greater than zero.");
    }

    positionOwnerLive = await readOwnerOf(rpcUrl, postVerification.nonfungiblePositionManager, postVerification.positionTokenId);

    if (!sameAddress(positionOwnerLive, postVerification.liquiditySafeAddress)) {
      issue("positionOwnerLive", "Position owner must remain liquidity Safe.");
    }
  } catch (error) {
    issue("fullLaunchLiveChecks", error.message);
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-full-launch-live-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_FULL_LAUNCH_LIVE_NOT_RECORDED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(reportDir, { recursive: true });

const finalizedAt = new Date().toISOString();

const record = {
  schema: "astra-full-launch-live-record-v0.1",
  finalizedAt,
  status: "FULL_LAUNCH_LIVE_PUBLIC_FINALIZATION_RECORDED_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED",
  finalizedBy,
  finalizationReference,
  launchPageUrl: "https://astratreasury.ai/launch",
  buyPageUrl: buyActivation.buyPageUrl,
  tradingLinkUrl: buyActivation.tradingLinkUrl,
  liquiditySafeAddress: postVerification.liquiditySafeAddress,
  executionTxHash: postVerification.executionTxHash,
  poolAddress: postVerification.poolAddress,
  poolLiquidityLive,
  positionTokenId: String(postVerification.positionTokenId),
  positionOwnerLive,
  finalizationPrerequisites: {
    fullLaunchApprovalRecorded: true,
    fullLaunchApproved: true,
    buyPageActivated: true,
    publicTradingLive: true,
    publicTradingApproved: true,
    publicTradingLinkApproved: true,
    dexLiquidityPostExecutionVerified: true,
    liquiditySafeTransactionExecuted: true,
    liquidityAdded: true,
    positionMinted: true,
    poolLiquidityVerifiedGreaterThanZero: true,
    positionOwnerVerified: true,
    globalTreasuryFundingApproved: false,
    globalTreasuryFundingExecuted: false
  },
  fullLaunchLiveRecorded: true,
  fullLaunchLive: true,
  fullLaunchApproved: true,
  buyPageActivated: true,
  publicTradingLive: true,
  publicTradingApproved: true,
  publicTradingLinkApproved: true,
  dexLiquidityPostExecutionVerified: true,
  liquidityAdded: true,
  positionMinted: true,
  treasuryFundingApproved: false,
  treasuryFundingExecuted: false,
  safety: {
    publicFinalizationOnly: true,
    approvesGlobalTreasuryFunding: false,
    executesGlobalTreasuryFunding: false
  }
};

record.finalizationHash = sha256Json(record);

writeJson(recordFile, record);

writeJson(liveEvidenceFile, {
  schema: "astra-full-launch-live-v0.1",
  finalizedAt,
  status: "FULL_LAUNCH_LIVE_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED",
  fullLaunchLiveRecorded: true,
  fullLaunchLive: true,
  fullLaunchApproved: true,
  buyPageActivated: true,
  publicTradingLive: true,
  buyPageUrl: record.buyPageUrl,
  launchPageUrl: record.launchPageUrl,
  tradingLinkUrl: record.tradingLinkUrl,
  treasuryFundingApproved: false,
  treasuryFundingExecuted: false,
  finalizationHash: record.finalizationHash
});

writeJson(fullLaunchStatusFile, {
  schema: "astra-full-launch-status-v0.1",
  generatedAt: finalizedAt,
  status: "FULL_LAUNCH_LIVE_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED",
  fullLaunchApproved: true,
  fullLaunchApprovalRecorded: true,
  fullLaunchLive: true,
  fullLaunchLiveRecorded: true,
  buyPageActivated: true,
  publicTradingLive: true,
  publicTradingApproved: true,
  publicTradingLinkApproved: true,
  buyPageUrl: record.buyPageUrl,
  launchPageUrl: record.launchPageUrl,
  tradingLinkUrl: record.tradingLinkUrl,
  liquiditySafeAddress: record.liquiditySafeAddress,
  poolAddress: record.poolAddress,
  poolLiquidityLive: record.poolLiquidityLive,
  positionTokenId: record.positionTokenId,
  treasuryFundingApproved: false,
  treasuryFundingExecuted: false,
  finalizationHash: record.finalizationHash,
  finalizationRecordFile: "reports/full-launch-live/full-launch-live-record.json"
});

const config = readJsonPath(configFile);

config.status = "full-launch-live-public-finalization-recorded-buy-page-active-public-trading-live-treasury-funding-not-approved";
config.fullLaunchLiveRecorded = true;
config.fullLaunchLive = true;
config.fullLaunchApproved = true;
config.buyPageActivated = true;
config.publicTradingLive = true;
config.publicTradingApproved = true;
config.publicTradingLinkApproved = true;
config.treasuryFundingApproved = false;
config.treasuryFundingExecuted = false;
config.recordedFullLaunchLive = {
  finalizedAt,
  finalizedBy,
  finalizationReference,
  launchPageUrl: record.launchPageUrl,
  buyPageUrl: record.buyPageUrl,
  tradingLinkUrl: record.tradingLinkUrl,
  liquiditySafeAddress: record.liquiditySafeAddress,
  executionTxHash: record.executionTxHash,
  poolAddress: record.poolAddress,
  poolLiquidityLive: record.poolLiquidityLive,
  positionTokenId: record.positionTokenId,
  finalizationHash: record.finalizationHash,
  recordFile: "reports/full-launch-live/full-launch-live-record.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-full-launch-live-result-v0.1",
  checkedAt: finalizedAt,
  status: record.status,
  launchPageUrl: record.launchPageUrl,
  buyPageUrl: record.buyPageUrl,
  tradingLinkUrl: record.tradingLinkUrl,
  poolAddress: record.poolAddress,
  poolLiquidityLive: record.poolLiquidityLive,
  positionTokenId: record.positionTokenId,
  fullLaunchLiveRecorded: true,
  fullLaunchLive: true,
  fullLaunchApproved: true,
  treasuryFundingApproved: false,
  treasuryFundingExecuted: false
}, null, 2));
