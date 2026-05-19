import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const confirm = process.env.DEX_BUY_PAGE_ACTIVATION_APPROVAL_CONFIRM || "";
const approver = process.env.DEX_BUY_PAGE_ACTIVATION_APPROVER || "";
const approvalReference = process.env.DEX_BUY_PAGE_ACTIVATION_APPROVAL_REFERENCE || "";
const approvedBuyPageUrlInput = process.env.DEX_BUY_PAGE_ACTIVATION_APPROVED_URL || "";
const overwrite = process.env.OVERWRITE_DEX_BUY_PAGE_ACTIVATION_APPROVAL || "";

const requiredConfirm = "APPROVE_DEX_BUY_PAGE_ACTIVATION_ONLY_NOT_LIVE_OR_FULL_LAUNCH";

const recordDir = path.join(root, "reports", "dex-buy-page-activation-approval");
const recordFile = path.join(recordDir, "dex-buy-page-activation-approval-record.json");
const configFile = path.join(root, "configs", "dex-buy-page-activation-approval.config.json");

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
  issue("DEX_BUY_PAGE_ACTIVATION_APPROVAL_CONFIRM", `Must equal ${requiredConfirm}.`);
}

requireUsable("DEX_BUY_PAGE_ACTIVATION_APPROVER", approver);
requireUsable("DEX_BUY_PAGE_ACTIVATION_APPROVAL_REFERENCE", approvalReference);

if (fs.existsSync(recordFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_DEX_BUY_PAGE_ACTIVATION_APPROVAL",
    "Approval record already exists. Set OVERWRITE_DEX_BUY_PAGE_ACTIVATION_APPROVAL=YES only if replacing intentionally."
  );
}

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

if (linkApproval.publicTradingApproved !== true || linkApproval.publicTradingLinkApproved !== true || linkApproval.publicTradingLinkApprovalRecorded !== true) {
  issue("linkApproval.flags", "Public trading link approval must be recorded and approved.");
}

if (!isHttpUrl(linkApproval.tradingLinkUrl)) {
  issue("linkApproval.tradingLinkUrl", "Approved public trading link URL must be valid.");
}

if (linkApproval.buyPageActivated !== false || linkApproval.fullLaunchApproved !== false) {
  issue("linkApproval.restrictions", "Buy page and full launch must remain false before activation approval.");
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
  "public-docs/dex-buy-page-activated-status.json",
  "public-docs/dex-buy-page-activation-live-status.json",
  "public-docs/full-launch-approved-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden buy-page-live/full-launch artifact exists.");
  }
}

const rpcUrl =
  process.env.DEX_BUY_PAGE_ACTIVATION_APPROVAL_RPC_URL ||
  process.env.DEX_PUBLIC_TRADING_LINK_APPROVAL_RPC_URL ||
  process.env.DEX_LIQUIDITY_POST_EXECUTION_VERIFICATION_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_BUY_PAGE_ACTIVATION_APPROVAL_RPC_URL", "RPC URL must be available and start with https://.");
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
    issue("buyPageActivationApprovalLiveChecks", error.message);
  }
}

const approvedBuyPageUrl = approvedBuyPageUrlInput || "https://astratreasury.ai/buy";

if (!isHttpUrl(approvedBuyPageUrl)) {
  issue("DEX_BUY_PAGE_ACTIVATION_APPROVED_URL", "Approved buy page URL must be an http(s) URL.");
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-buy-page-activation-approval-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_BUY_PAGE_ACTIVATION_NOT_APPROVED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const recordedAt = new Date().toISOString();

const record = {
  schema: "astra-dex-buy-page-activation-approval-record-v0.1",
  recordedAt,
  status: "DEX_BUY_PAGE_ACTIVATION_APPROVED_PUBLIC_TRADING_LINK_APPROVED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED",
  approvalScope: "dex-buy-page-activation-approval-only-not-live-not-full-launch",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  approver,
  approvalReference,
  approvedBuyPageUrl,
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
  approvalPrerequisites: {
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
  buyPageActivationApprovalRecorded: true,
  buyPageActivationApproved: true,
  buyPageActivated: false,
  publicTradingApproved: true,
  publicTradingLinkApproved: true,
  publicTradingLive: false,
  fullLaunchApproved: false,
  requiredBeforeBuyPageActivationLive: {
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
    positionOwnerVerified: true,
    buyPageActivated: false,
    fullLaunchApproved: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    approvalOnly: true,
    activatesBuyPageNow: false,
    approvesGlobalTreasuryFunding: false,
    approvesFullLaunch: false
  }
};

record.approvalHash = sha256Json(record);

writeJson(recordFile, record);

const config = readJsonPath(configFile);

config.status = "dex-buy-page-activation-approved-public-trading-link-approved-buy-page-not-activated-full-launch-not-approved";
config.buyPageActivationApprovalRecorded = true;
config.buyPageActivationApproved = true;
config.buyPageActivated = false;
config.publicTradingApproved = true;
config.publicTradingLinkApproved = true;
config.publicTradingLive = false;
config.fullLaunchApproved = false;
config.approvedDexBuyPageActivation = {
  recordedAt,
  approver,
  approvalReference,
  approvedBuyPageUrl,
  tradingLinkUrl: record.tradingLinkUrl,
  liquiditySafeAddress: record.liquiditySafeAddress,
  executionTxHash: record.executionTxHash,
  poolAddress: record.poolAddress,
  poolLiquidityLive: record.poolLiquidityLive,
  positionTokenId: record.positionTokenId,
  approvalHash: record.approvalHash,
  recordFile: "reports/dex-buy-page-activation-approval/dex-buy-page-activation-approval-record.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-buy-page-activation-approval-result-v0.1",
  checkedAt: recordedAt,
  status: record.status,
  approvedBuyPageUrl,
  tradingLinkUrl: record.tradingLinkUrl,
  liquiditySafeAddress: record.liquiditySafeAddress,
  executionTxHash: record.executionTxHash,
  poolAddress: record.poolAddress,
  poolLiquidityLive: record.poolLiquidityLive,
  positionTokenId: record.positionTokenId,
  publicTradingApproved: true,
  publicTradingLinkApproved: true,
  buyPageActivationApproved: true,
  buyPageActivated: false,
  fullLaunchApproved: false
}, null, 2));
