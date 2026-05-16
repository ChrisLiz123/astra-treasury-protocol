import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const reportDir = path.join(root, "reports", "dex-liquidity-token-approval-requirements-recheck");
const reportFile = path.join(reportDir, "dex-liquidity-token-approval-requirements-recheck.json");
const configFile = path.join(root, "configs", "dex-liquidity-token-approval-requirements-recheck.config.json");

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function tryReadJson(relativePath, fallback = null) {
  try {
    const full = path.join(root, relativePath);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    return fallback;
  }
}

function readJsonPath(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
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

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function encodeAddress(value) {
  return String(value).replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

function decodeUint(value) {
  const clean = String(value || "").replace(/^0x/i, "").padStart(64, "0");
  return BigInt(`0x${clean}`);
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

async function readTokenBalance(rpcUrl, tokenAddress, ownerAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: tokenAddress, data: "0x70a08231" + encodeAddress(ownerAddress)},
    "latest"
  ]);

  return decodeUint(result).toString();
}

async function readTokenAllowance(rpcUrl, tokenAddress, ownerAddress, spenderAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: tokenAddress, data: "0xdd62ed3e" + encodeAddress(ownerAddress) + encodeAddress(spenderAddress)},
    "latest"
  ]);

  return decodeUint(result).toString();
}

async function readTokenDecimals(rpcUrl, tokenAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: tokenAddress, data: "0x313ce567"},
    "latest"
  ]);

  return Number(decodeUint(result));
}

function rawToHuman(raw, decimals) {
  const value = BigInt(String(raw || "0"));
  const d = Number(decimals || 0);
  const base = 10n ** BigInt(d);
  const whole = value / base;
  const frac = value % base;

  if (frac === 0n) return whole.toString();

  return `${whole}.${frac.toString().padStart(d, "0").replace(/0+$/, "")}`;
}

function findDeepAddressByKeys(obj, keyHints) {
  const seen = new Set();

  function walk(value) {
    if (!value || typeof value !== "object") return "";

    if (seen.has(value)) return "";
    seen.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = walk(item);
        if (found) return found;
      }
      return "";
    }

    for (const [key, item] of Object.entries(value)) {
      const normalized = key.toLowerCase();

      if (keyHints.some((hint) => normalized.includes(hint)) && isAddress(item)) {
        return item;
      }
    }

    for (const item of Object.values(value)) {
      const found = walk(item);
      if (found) return found;
    }

    return "";
  }

  return walk(obj);
}

function findArrayByPossibleKeys(obj, keys) {
  if (!obj || typeof obj !== "object") return null;

  for (const key of keys) {
    if (Array.isArray(obj[key])) return obj[key];
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = findArrayByPossibleKeys(value, keys);
      if (found) return found;
    }
  }

  return null;
}

function getFirstString(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

fs.mkdirSync(reportDir, { recursive: true });

const postBalanceStatus = readJson("public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json");
const postBalanceReport = readJson("reports/dex-liquidity-funding-transfer-post-execution-balances/dex-liquidity-funding-transfer-post-execution-balances.json");
const executionLiveStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-execution-live-status.json");
const fundsMoved = readJson("reports/dex-liquidity-treasury-funding/live/funds-moved.json");
const previousApprovalReview = tryReadJson("reports/dex-liquidity-token-approval-requirements/dex-liquidity-token-approval-requirements-review.json", {});
const previousApprovalStatus = tryReadJson("public-docs/dex-liquidity-token-approval-requirements-status.json", {});
const mintReviewStatus = tryReadJson("public-docs/dex-liquidity-mint-parameter-review-status.json", {});
const postExecutionPool = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireStatus(
  "postBalanceStatus.status",
  postBalanceStatus.status,
  "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_VERIFIED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING"
);

requireStatus(
  "postBalanceReport.status",
  postBalanceReport.status,
  "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_VERIFIED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING"
);

requireStatus(
  "executionLiveStatus.status",
  executionLiveStatus.status,
  "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_EXECUTION_LIVE_RECORDED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING"
);

requireStatus(
  "fundsMoved.status",
  fundsMoved.status,
  "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_EXECUTED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING"
);

if (postBalanceStatus.summary?.postExecutionBalanceVerificationComplete !== true) {
  issue("postBalanceStatus.summary.postExecutionBalanceVerificationComplete", "Post-execution balance verification must be complete.");
}

if (postBalanceStatus.summary?.destinationBalancesFunded !== true) {
  issue("postBalanceStatus.summary.destinationBalancesFunded", "Destination liquidity Safe balances must be funded.");
}

if (postBalanceStatus.summary?.poolLiquidityVerifiedZero !== true) {
  issue("postBalanceStatus.summary.poolLiquidityVerifiedZero", "Pool liquidity must remain zero.");
}

if (postBalanceStatus.summary?.tokenApprovalExecuted !== false || postBalanceStatus.summary?.liquidityAdded !== false || postBalanceStatus.summary?.publicTradingApproved !== false) {
  issue("postBalanceStatus.summary.restrictions", "Token approval, liquidity, and public trading must remain false.");
}

if (postExecutionPool.status !== "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
  issue("postExecutionPool.status", "Pool post-execution verification must remain no-liquidity/no-public-trading.");
}

if (postExecutionPool.summary?.liquidityVerifiedZero !== true || String(postExecutionPool.summary?.poolLiquidity || "") !== "0") {
  issue("postExecutionPool.summary.poolLiquidity", "Pool liquidity must remain zero.");
}

if (fullLaunch.fullLaunchApproved !== false) {
  issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
}

if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
  issue("treasuryFunding", "Global treasury funding must remain not approved/executed.");
}

if (capabilityMatrix.allCapabilitiesDisabled !== true || capabilityMatrix.allCapabilityApprovalsFalse !== true) {
  issue("capabilityMatrix", "Capability Matrix must remain all-disabled.");
}

if (monitor.status !== "PASS") issue("monitor.status", `Expected PASS, got ${monitor.status}.`);
if (alerts.responseRequired === true) issue("alerts.responseRequired", "Alerts must not require response.");
if (Number(incidents?.summary?.active || 0) !== 0) issue("incidents.summary.active", "Active incidents must be zero.");
if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") issue("execution.mode", "Mainnet execution queue must remain disabled.");

const forbiddenFiles = [
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/payload/token-approval-safe-payload.json",
  "reports/dex-liquidity-token-approval/live/token-approval-executed.json",
  "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden token approval/liquidity/public-trading artifact exists. Recheck must not generate or execute approvals.");
  }
}

const rpcUrl =
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_RECHECK_RPC_URL ||
  process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_LIQUIDITY_TOKEN_APPROVAL_RECHECK_RPC_URL", "RPC URL must be available and start with https://.");
}

const liquiditySafeAddress =
  postBalanceReport.destinationSafeAddress ||
  postBalanceStatus.summary?.destinationSafeAddress ||
  fundsMoved.destinationSafeAddress ||
  "";

if (!isAddress(liquiditySafeAddress)) {
  issue("liquiditySafeAddress", "Liquidity/destination Safe address must be available.");
}

let approvalSpender =
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_SPENDER ||
  findDeepAddressByKeys(previousApprovalReview, ["spender", "positionmanager", "nonfungiblepositionmanager", "allowance"]) ||
  findDeepAddressByKeys(previousApprovalStatus, ["spender", "positionmanager", "nonfungiblepositionmanager", "allowance"]) ||
  findDeepAddressByKeys(mintReviewStatus, ["spender", "positionmanager", "nonfungiblepositionmanager", "allowance"]) ||
  "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";

if (!isAddress(approvalSpender)) {
  issue("approvalSpender", "Approval spender must be a valid address. Set DEX_LIQUIDITY_TOKEN_APPROVAL_SPENDER if needed.");
}

const previousTokenRequirements =
  findArrayByPossibleKeys(previousApprovalReview, ["tokenApprovalRequirements", "tokens", "tokenRequirements"]) ||
  [];

const movedChecks = Array.isArray(postBalanceReport.balanceVerificationChecks)
  ? postBalanceReport.balanceVerificationChecks
  : Array.isArray(fundsMoved.executionBalanceChecks)
    ? fundsMoved.executionBalanceChecks
    : [];

const tokenMap = new Map();

for (const item of previousTokenRequirements) {
  const tokenAddress = item.tokenAddress || item.address;
  if (!isAddress(tokenAddress)) continue;

  const key = tokenAddress.toLowerCase();

  tokenMap.set(key, {
    role: item.role || "",
    symbol: item.symbol || item.tokenSymbol || "",
    tokenAddress,
    decimals: item.decimals,
    desiredRaw: getFirstString(item, [
      "desiredRaw",
      "desiredRawAmount",
      "amountDesiredRaw",
      "plannedRawAmount",
      "requiredRawAmount",
      "approvalAmountRaw",
      "shortfallRaw",
      "amountRaw"
    ]),
    desiredHuman: getFirstString(item, [
      "desiredHuman",
      "desiredHumanAmount",
      "amountDesiredHuman",
      "plannedHumanAmount",
      "requiredHumanAmount",
      "approvalAmountHuman",
      "shortfallHuman",
      "amountHuman"
    ])
  });
}

for (const item of movedChecks) {
  const tokenAddress = item.tokenAddress;
  if (!isAddress(tokenAddress)) continue;

  const key = tokenAddress.toLowerCase();
  const existing = tokenMap.get(key) || {};

  tokenMap.set(key, {
    role: existing.role || item.role || "",
    symbol: existing.symbol || item.symbol || "",
    tokenAddress,
    decimals: existing.decimals,
    desiredRaw: existing.desiredRaw || item.amountRaw || item.destinationCurrentRaw || item.expectedDestinationAfterRaw || "",
    desiredHuman: existing.desiredHuman || item.amountHuman || ""
  });
}

const tokenItems = [...tokenMap.values()];

if (tokenItems.length <= 0) {
  issue("tokenItems", "Could not determine token approval requirements to recheck.");
}

let tokenApprovalRequirements = [];

if (issues.length === 0) {
  try {
    for (const item of tokenItems) {
      const decimals = Number.isInteger(Number(item.decimals))
        ? Number(item.decimals)
        : await readTokenDecimals(rpcUrl, item.tokenAddress);

      const currentBalanceRaw = await readTokenBalance(rpcUrl, item.tokenAddress, liquiditySafeAddress);
      const currentAllowanceRaw = await readTokenAllowance(rpcUrl, item.tokenAddress, liquiditySafeAddress, approvalSpender);

      const desiredRaw = String(item.desiredRaw || currentBalanceRaw);
      const desiredRawBig = BigInt(desiredRaw || "0");
      const currentBalanceBig = BigInt(currentBalanceRaw || "0");
      const currentAllowanceBig = BigInt(currentAllowanceRaw || "0");

      const hasRequiredBalance = currentBalanceBig >= desiredRawBig;
      const approvalRequired = desiredRawBig > 0n && currentAllowanceBig < desiredRawBig;
      const missingAllowanceRaw = approvalRequired ? (desiredRawBig - currentAllowanceBig).toString() : "0";

      if (!hasRequiredBalance) {
        issue(`token.${item.symbol || item.role}.balance`, `Current balance ${currentBalanceRaw} is below desired amount ${desiredRaw}.`);
      }

      tokenApprovalRequirements.push({
        role: item.role,
        symbol: item.symbol,
        tokenAddress: item.tokenAddress,
        decimals,
        ownerSafeAddress: liquiditySafeAddress,
        spenderAddress: approvalSpender,
        desiredRaw,
        desiredHuman: item.desiredHuman || rawToHuman(desiredRaw, decimals),
        currentBalanceRaw,
        currentBalanceHuman: rawToHuman(currentBalanceRaw, decimals),
        currentAllowanceRaw,
        currentAllowanceHuman: rawToHuman(currentAllowanceRaw, decimals),
        hasRequiredBalance,
        approvalRequired,
        missingAllowanceRaw,
        missingAllowanceHuman: rawToHuman(missingAllowanceRaw, decimals),
        recommendedApprovalAmountRaw: approvalRequired ? desiredRaw : "0",
        recommendedApprovalAmountHuman: approvalRequired ? (item.desiredHuman || rawToHuman(desiredRaw, decimals)) : "0",
        tokenApprovalPayloadGenerated: false,
        tokenApprovalExecuted: false
      });
    }
  } catch (error) {
    issue("approvalRecheckRpc", error.message);
  }
}

if (issues.length > 0) {
  const failed = {
    schema: "astra-dex-liquidity-token-approval-requirements-recheck-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK_FAILED",
    issues
  };

  writeJson(reportFile, failed);
  console.log(JSON.stringify(failed, null, 2));
  process.exit(1);
}

const tokenApprovalsRequiredBeforeLiquidity = tokenApprovalRequirements.some((item) => item.approvalRequired === true);
const allRequiredBalancesAvailable = tokenApprovalRequirements.every((item) => item.hasRequiredBalance === true);
const allRequiredAllowancesAvailable = tokenApprovalRequirements.every((item) => item.approvalRequired === false);

const status = tokenApprovalsRequiredBeforeLiquidity
  ? "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK_COMPLETE_APPROVALS_REQUIRED_NO_APPROVALS_EXECUTED"
  : "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK_COMPLETE_NO_APPROVALS_REQUIRED_NO_APPROVALS_EXECUTED";

const recheckedAt = new Date().toISOString();

const report = {
  schema: "astra-dex-liquidity-token-approval-requirements-recheck-v0.1",
  recheckedAt,
  status,
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  liquiditySafeAddress,
  approvalSpender,
  spenderReference: process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_SPENDER
    ? "environment override DEX_LIQUIDITY_TOKEN_APPROVAL_SPENDER"
    : "detected from prior review or default Uniswap V3 Nonfungible Position Manager on Base",
  postExecutionBalanceVerificationReference: "public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json",
  tokenApprovalRequirements,
  tokenCount: tokenApprovalRequirements.length,
  tokenApprovalsRequiredBeforeLiquidity,
  allRequiredBalancesAvailable,
  allRequiredAllowancesAvailable,
  fundingTransferExecuted: true,
  treasuryFundsMoved: true,
  destinationBalancesFunded: true,
  tokenApprovalRequirementsRecheckComplete: true,
  tokenApprovalPayloadGenerated: false,
  tokenApprovalExecuted: false,
  liquidityMintCalldataGenerated: false,
  liquiditySafePayloadGenerated: false,
  liquiditySafeTransactionSubmitted: false,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  publicTradingLinkApproved: false,
  buyPageActivated: false,
  fullLaunchApproved: false,
  requiredBeforeTokenApprovalPayloadGenerationApproval: {
    postExecutionBalanceVerificationComplete: true,
    tokenApprovalRequirementsRecheckComplete: true,
    tokenApprovalsRequiredBeforeLiquidity,
    tokenApprovalPayloadGenerationApprovalRecorded: false,
    tokenApprovalPayloadGenerated: false,
    tokenApprovalExecuted: false,
    liquidityPayloadGenerationApprovalRecorded: false,
    publicStatusUpdatePrepared: false
  },
  requiredBeforeLiquidityCalldataGenerationApproval: {
    postExecutionBalanceVerificationComplete: true,
    tokenApprovalRequirementsRecheckComplete: true,
    allRequiredBalancesAvailable,
    allRequiredAllowancesAvailable,
    tokenApprovalExecuted: false,
    liquidityPayloadGenerationApprovalRecorded: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    recheckOnly: true,
    executesTokenApproval: false,
    generatesTokenApprovalPayload: false,
    generatesLiquidityCalldata: false,
    addsLiquidity: false,
    mintsPosition: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

report.recheckHash = sha256Json(report);

writeJson(reportFile, report);

const config = readJsonPath(configFile);

config.status = status.toLowerCase().replace(/^dex_liquidity_/, "").replace(/_/g, "-");
config.tokenApprovalRequirementsRecheckComplete = true;
config.tokenApprovalsRequiredBeforeLiquidity = tokenApprovalsRequiredBeforeLiquidity;
config.allRequiredBalancesAvailable = allRequiredBalancesAvailable;
config.allRequiredAllowancesAvailable = allRequiredAllowancesAvailable;
config.fundingTransferExecuted = true;
config.treasuryFundsMoved = true;
config.tokenApprovalPayloadGenerated = false;
config.tokenApprovalExecuted = false;
config.liquidityMintCalldataGenerated = false;
config.liquiditySafePayloadGenerated = false;
config.liquiditySafeTransactionSubmitted = false;
config.liquiditySafeTransactionExecuted = false;
config.liquidityAdded = false;
config.positionMinted = false;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.buyPageActivationApproved = false;
config.fullLaunchApproved = false;
config.tokenApprovalRequirementsRecheck = {
  recheckedAt,
  liquiditySafeAddress,
  approvalSpender,
  tokenApprovalsRequiredBeforeLiquidity,
  tokenCount: tokenApprovalRequirements.length,
  recordFile: "reports/dex-liquidity-token-approval-requirements-recheck/dex-liquidity-token-approval-requirements-recheck.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-token-approval-requirements-recheck-result-v0.1",
  checkedAt: recheckedAt,
  status,
  liquiditySafeAddress,
  approvalSpender,
  tokenCount: tokenApprovalRequirements.length,
  tokenApprovalsRequiredBeforeLiquidity,
  allRequiredBalancesAvailable,
  allRequiredAllowancesAvailable,
  fundingTransferExecuted: true,
  treasuryFundsMoved: true,
  tokenApprovalPayloadGenerated: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
