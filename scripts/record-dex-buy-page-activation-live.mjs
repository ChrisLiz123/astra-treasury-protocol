import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const confirm = process.env.DEX_BUY_PAGE_ACTIVATION_LIVE_CONFIRM || "";
const activatedBy = process.env.DEX_BUY_PAGE_ACTIVATED_BY || "";
const activationReference = process.env.DEX_BUY_PAGE_ACTIVATION_REFERENCE || "";
const overwrite = process.env.OVERWRITE_DEX_BUY_PAGE_ACTIVATION_LIVE || "";

const requiredConfirm = "ACTIVATE_DEX_BUY_PAGE_LIVE_NO_FULL_LAUNCH";

const reportDir = path.join(root, "reports", "dex-buy-page-activation-live");
const recordFile = path.join(reportDir, "dex-buy-page-activation-live-record.json");
const configFile = path.join(root, "configs", "dex-buy-page-activation-live.config.json");

const buyPageLiveDir = path.join(root, "reports", "dex-buy-page", "live");
const publicTradingLiveDir = path.join(root, "reports", "dex-public-trading", "live");
const buyPageActivatedFile = path.join(buyPageLiveDir, "buy-page-activated.json");
const publicTradingLiveFile = path.join(publicTradingLiveDir, "public-trading-live.json");

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
  issue("DEX_BUY_PAGE_ACTIVATION_LIVE_CONFIRM", `Must equal ${requiredConfirm}.`);
}

requireUsable("DEX_BUY_PAGE_ACTIVATED_BY", activatedBy);
requireUsable("DEX_BUY_PAGE_ACTIVATION_REFERENCE", activationReference);

if (fs.existsSync(recordFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_DEX_BUY_PAGE_ACTIVATION_LIVE",
    "Activation live record already exists. Set OVERWRITE_DEX_BUY_PAGE_ACTIVATION_LIVE=YES only if replacing intentionally."
  );
}

const activationApprovalStatus = readJson("public-docs/dex-buy-page-activation-approval-status.json");
const activationApproval = readJson("reports/dex-buy-page-activation-approval/dex-buy-page-activation-approval-record.json");
const linkApprovalStatus = readJson("public-docs/dex-public-trading-link-approval-status.json");
const linkApproval = readJson("reports/dex-public-trading-link-approval/dex-public-trading-link-approval-record.json");
const tradingApprovalStatus = readJson("public-docs/dex-public-trading-approval-status.json");
const tradingApproval = readJson("reports/dex-public-trading-approval/dex-public-trading-approval-record.json");
const postStatus = readJson("public-docs/dex-liquidity-post-execution-verification-status.json");
const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");
const executionLiveStatus = readJson("public-docs/dex-liquidity-safe-execution-live-status.json");
const executionLive = readJson("reports/dex-liquidity-safe-execution-live/dex-liquidity-safe-execution-live-record.json");
const liquidityAdded = readJson("reports/dex-liquidity-provision/live/liquidity-added.json");
const positionMinted = readJson("reports/dex-liquidity-provision/live/position-minted.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json", {});
const alerts = readJson("public-docs/mainnet-alerts-status.json", {});
const incidents = readJson("public-docs/incident-summary.json", {});

requireStatus("activationApprovalStatus.status", activationApprovalStatus.status, "DEX_BUY_PAGE_ACTIVATION_APPROVED_PUBLIC_TRADING_LINK_APPROVED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED");
requireStatus("activationApproval.status", activationApproval.status, "DEX_BUY_PAGE_ACTIVATION_APPROVED_PUBLIC_TRADING_LINK_APPROVED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED");
requireStatus("linkApprovalStatus.status", linkApprovalStatus.status, "DEX_PUBLIC_TRADING_LINK_APPROVED_PUBLIC_TRADING_APPROVED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED");
requireStatus("linkApproval.status", linkApproval.status, "DEX_PUBLIC_TRADING_LINK_APPROVED_PUBLIC_TRADING_APPROVED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED");
requireStatus("tradingApprovalStatus.status", tradingApprovalStatus.status, "DEX_PUBLIC_TRADING_APPROVED_LIQUIDITY_VERIFIED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED");
requireStatus("tradingApproval.status", tradingApproval.status, "DEX_PUBLIC_TRADING_APPROVED_LIQUIDITY_VERIFIED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED");
requireStatus("postStatus.status", postStatus.status, "DEX_LIQUIDITY_POST_EXECUTION_VERIFIED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("postVerification.status", postVerification.status, "DEX_LIQUIDITY_POST_EXECUTION_VERIFIED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("executionLiveStatus.status", executionLiveStatus.status, "DEX_LIQUIDITY_SAFE_EXECUTION_LIVE_RECORDED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("executionLive.status", executionLive.status, "DEX_LIQUIDITY_SAFE_EXECUTION_LIVE_RECORDED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("liquidityAdded.status", liquidityAdded.status, "DEX_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("positionMinted.status", positionMinted.status, "DEX_LIQUIDITY_POSITION_MINTED_NO_PUBLIC_TRADING");

if (activationApproval.buyPageActivationApproved !== true || activationApproval.buyPageActivated !== false) {
  issue("activationApproval.flags", "Buy page activation must be approved and not yet activated.");
}

if (linkApproval.publicTradingApproved !== true || linkApproval.publicTradingLinkApproved !== true || !isHttpUrl(linkApproval.tradingLinkUrl)) {
  issue("linkApproval.flags", "Public trading and public trading link must be approved with a valid trading link.");
}

if (tradingApproval.publicTradingApproved !== true) {
  issue("tradingApproval.publicTradingApproved", "Public trading approval must be true.");
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

if (fullLaunch.fullLaunchApproved !== false) {
  issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
}

if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
  issue("treasuryFunding", "Global treasury funding must remain not approved/executed.");
}

if (capabilityMatrix.allCapabilityApprovalsFalse !== true) {
  issue("capabilityMatrix", "Capability approvals must remain false before full launch.");
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

const forbiddenFiles = [
  "public-docs/full-launch-approved-status.json",
  "public-docs/full-launch-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden full-launch artifact exists.");
  }
}

const rpcUrl =
  process.env.DEX_BUY_PAGE_ACTIVATION_LIVE_RPC_URL ||
  process.env.DEX_BUY_PAGE_ACTIVATION_APPROVAL_RPC_URL ||
  process.env.DEX_PUBLIC_TRADING_LINK_APPROVAL_RPC_URL ||
  process.env.DEX_LIQUIDITY_POST_EXECUTION_VERIFICATION_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_BUY_PAGE_ACTIVATION_LIVE_RPC_URL", "RPC URL must be available and start with https://.");
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
    issue("buyPageActivationLiveChecks", error.message);
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-buy-page-activation-live-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_BUY_PAGE_ACTIVATION_LIVE_NOT_RECORDED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(buyPageLiveDir, { recursive: true });
fs.mkdirSync(publicTradingLiveDir, { recursive: true });

const activatedAt = new Date().toISOString();

const record = {
  schema: "astra-dex-buy-page-activation-live-record-v0.1",
  activatedAt,
  status: "DEX_BUY_PAGE_ACTIVATION_LIVE_RECORDED_BUY_PAGE_ACTIVATED_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  activatedBy,
  activationReference,
  buyPageUrl: activationApproval.approvedBuyPageUrl || "https://astratreasury.ai/buy",
  tradingLinkUrl: linkApproval.tradingLinkUrl,
  liquiditySafeAddress: postVerification.liquiditySafeAddress,
  executionTxHash: postVerification.executionTxHash,
  poolAddress: postVerification.poolAddress,
  poolLiquidityLive,
  positionTokenId: String(postVerification.positionTokenId),
  positionOwnerLive,
  safePayloadHash: executionLive.safePayloadHash,
  transactionBuilderHash: executionLive.transactionBuilderHash,
  calldataHash: executionLive.calldataHash,
  activationPrerequisites: {
    buyPageActivationApprovalRecorded: true,
    buyPageActivationApproved: true,
    publicTradingApprovalRecorded: true,
    publicTradingApproved: true,
    publicTradingLinkApprovalRecorded: true,
    publicTradingLinkApproved: true,
    dexLiquidityPostExecutionVerified: true,
    liquiditySafeTransactionExecuted: true,
    liquidityAdded: true,
    positionMinted: true,
    poolLiquidityVerifiedGreaterThanZero: true,
    positionOwnerVerified: true
  },
  buyPageActivationLiveRecorded: true,
  buyPageActivated: true,
  publicTradingLive: true,
  publicTradingApproved: true,
  publicTradingLinkApproved: true,
  buyPageActivationApproved: true,
  liquidityAdded: true,
  positionMinted: true,
  fullLaunchApproved: false,
  requiredBeforeFullLaunchReadinessReview: {
    buyPageActivationLiveRecorded: true,
    buyPageActivated: true,
    publicTradingLive: true,
    publicTradingApproved: true,
    publicTradingLinkApproved: true,
    dexLiquidityPostExecutionVerified: true,
    liquiditySafeTransactionExecuted: true,
    liquidityAdded: true,
    positionMinted: true,
    fullLaunchApproved: false,
    publicStatusUpdatePrepared: true
  },
  safety: {
    activatesBuyPage: true,
    approvesGlobalTreasuryFunding: false,
    approvesFullLaunch: false
  }
};

record.activationHash = sha256Json(record);

writeJson(recordFile, record);

writeJson(buyPageActivatedFile, {
  schema: "astra-dex-buy-page-activated-v0.1",
  activatedAt,
  status: "DEX_BUY_PAGE_ACTIVATED_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED",
  buyPageUrl: record.buyPageUrl,
  tradingLinkUrl: record.tradingLinkUrl,
  liquiditySafeAddress: record.liquiditySafeAddress,
  poolAddress: record.poolAddress,
  poolLiquidityLive: record.poolLiquidityLive,
  positionTokenId: record.positionTokenId,
  buyPageActivated: true,
  publicTradingLive: true,
  fullLaunchApproved: false
});

writeJson(publicTradingLiveFile, {
  schema: "astra-dex-public-trading-live-v0.1",
  activatedAt,
  status: "DEX_PUBLIC_TRADING_LIVE_BUY_PAGE_ACTIVATED_FULL_LAUNCH_NOT_APPROVED",
  tradingLinkUrl: record.tradingLinkUrl,
  buyPageUrl: record.buyPageUrl,
  liquiditySafeAddress: record.liquiditySafeAddress,
  poolAddress: record.poolAddress,
  poolLiquidityLive: record.poolLiquidityLive,
  positionTokenId: record.positionTokenId,
  publicTradingApproved: true,
  publicTradingLinkApproved: true,
  publicTradingLive: true,
  buyPageActivated: true,
  fullLaunchApproved: false
});

const config = readJsonPath(configFile);

config.status = "dex-buy-page-activation-live-recorded-buy-page-activated-public-trading-live-full-launch-not-approved";
config.buyPageActivationLiveRecorded = true;
config.buyPageActivated = true;
config.publicTradingLive = true;
config.publicTradingApproved = true;
config.publicTradingLinkApproved = true;
config.buyPageActivationApproved = true;
config.fullLaunchApproved = false;
config.recordedDexBuyPageActivationLive = {
  activatedAt,
  activatedBy,
  activationReference,
  buyPageUrl: record.buyPageUrl,
  tradingLinkUrl: record.tradingLinkUrl,
  liquiditySafeAddress: record.liquiditySafeAddress,
  executionTxHash: record.executionTxHash,
  poolAddress: record.poolAddress,
  poolLiquidityLive: record.poolLiquidityLive,
  positionTokenId: record.positionTokenId,
  activationHash: record.activationHash,
  recordFile: "reports/dex-buy-page-activation-live/dex-buy-page-activation-live-record.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-buy-page-activation-live-result-v0.1",
  checkedAt: activatedAt,
  status: record.status,
  buyPageUrl: record.buyPageUrl,
  tradingLinkUrl: record.tradingLinkUrl,
  liquiditySafeAddress: record.liquiditySafeAddress,
  executionTxHash: record.executionTxHash,
  poolAddress: record.poolAddress,
  poolLiquidityLive: record.poolLiquidityLive,
  positionTokenId: record.positionTokenId,
  buyPageActivated: true,
  publicTradingLive: true,
  fullLaunchApproved: false
}, null, 2));
