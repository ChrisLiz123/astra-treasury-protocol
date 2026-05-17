import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const reportDir = path.join(root, "reports", "dex-liquidity-token-approval-post-execution-allowances");
const reportFile = path.join(reportDir, "dex-liquidity-token-approval-post-execution-allowances.json");
const configFile = path.join(root, "configs", "dex-liquidity-token-approval-post-execution-allowances.config.json");

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
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

function isTxHash(value) {
  return /^0x[0-9a-fA-F]{64}$/.test(String(value || "").trim());
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

async function readPoolLiquidity(rpcUrl, poolAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: poolAddress, data: "0x1a686502"},
    "latest"
  ]);

  return decodeUint(result).toString();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "astra-treasury-protocol-token-approval-post-execution-allowances/0.1"
    }
  });

  if (!response.ok) throw new Error(`GET ${url} returned HTTP ${response.status}`);
  return response.json();
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

fs.mkdirSync(reportDir, { recursive: true });

const executionLiveStatus = readJson("public-docs/dex-liquidity-token-approval-safe-execution-live-status.json");
const executionLiveRecord = readJson("reports/dex-liquidity-token-approval-safe-execution-live/dex-liquidity-token-approval-safe-execution-live-record.json");
const tokenApprovalExecuted = readJson("reports/dex-liquidity-token-approval/live/token-approval-executed.json");
const payload = readJson("reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json");
const postExecutionPool = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireStatus("executionLiveStatus.status", executionLiveStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_LIVE_RECORDED_APPROVALS_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("executionLiveRecord.status", executionLiveRecord.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_LIVE_RECORDED_APPROVALS_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("tokenApprovalExecuted.status", tokenApprovalExecuted.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("payload.status", payload.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("postExecutionPool.status", postExecutionPool.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

if (executionLiveStatus.summary?.tokenApprovalSafeTransactionExecuted !== true || executionLiveStatus.summary?.tokenApprovalExecuted !== true) {
  issue("executionLiveStatus.summary", "Execution live status must show Safe transaction and token approval executed.");
}

if (executionLiveStatus.summary?.liquidityAdded !== false || executionLiveStatus.summary?.publicTradingApproved !== false || executionLiveStatus.summary?.fullLaunchApproved !== false) {
  issue("executionLiveStatus.summary.restrictions", "Liquidity, public trading, and full launch must remain false.");
}

if (!isAddress(payload.liquiditySafeAddress) || !isAddress(payload.approvalSpender)) {
  issue("payload.addresses", "Payload liquidity Safe and approval spender must be valid.");
}

if (!isTxHash(executionLiveRecord.executionTxHash)) {
  issue("executionLiveRecord.executionTxHash", "Execution tx hash must be valid.");
}

if (executionLiveRecord.payloadHash !== payload.payloadHash || tokenApprovalExecuted.payloadHash !== payload.payloadHash) {
  issue("payloadHash", "Execution live, token approval executed evidence, and payload hashes must match.");
}

if (postExecutionPool.summary?.liquidityVerifiedZero !== true || String(postExecutionPool.summary?.poolLiquidity || "") !== "0") {
  issue("postExecutionPool.summary.poolLiquidity", "Pool liquidity must remain zero.");
}

if (fullLaunch.fullLaunchApproved !== false) issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) issue("treasuryFunding", "Global treasury funding must remain not approved/executed.");
if (capabilityMatrix.allCapabilitiesDisabled !== true || capabilityMatrix.allCapabilityApprovalsFalse !== true) issue("capabilityMatrix", "Capability Matrix must remain all-disabled.");
if (monitor.status !== "PASS") issue("monitor.status", `Expected PASS, got ${monitor.status}.`);
if (alerts.responseRequired === true) issue("alerts.responseRequired", "Alerts must not require response.");
if (Number(incidents?.summary?.active || 0) !== 0) issue("incidents.summary.active", "Active incidents must be zero.");
if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") issue("execution.mode", "Mainnet execution queue must remain disabled.");

const forbiddenFiles = [
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden liquidity/public-trading artifact exists. Allowance verification must not add liquidity or enable trading.");
  }
}

const rpcUrl =
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_POST_EXECUTION_ALLOWANCES_RPC_URL ||
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_LIVE_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_LIQUIDITY_TOKEN_APPROVAL_POST_EXECUTION_ALLOWANCES_RPC_URL", "RPC URL must be available and start with https://.");
}

const txServiceBaseUrl = (
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_TX_SERVICE_BASE_URL ||
  "https://safe-transaction-base.safe.global/api"
).replace(/\/+$/, "");

let safeTransactionService = {};
let receiptStatus = "";
let allowanceVerificationChecks = [];
let poolLiquidityCurrent = String(postExecutionPool.summary?.poolLiquidity || "0");
let poolLiquidityVerifiedZero = String(postExecutionPool.summary?.poolLiquidity || "0") === "0";

if (issues.length === 0) {
  try {
    safeTransactionService = await fetchJson(`${txServiceBaseUrl}/v1/multisig-transactions/${executionLiveRecord.safeTxHash}/`);

    if (safeTransactionService.isExecuted !== true) {
      issue("safeTransactionService.isExecuted", "Safe Transaction Service must show executed.");
    }

    if (!isTxHash(safeTransactionService.transactionHash || "")) {
      issue("safeTransactionService.transactionHash", "Safe Transaction Service must expose valid execution transaction hash.");
    }

    if (String(safeTransactionService.transactionHash || "").toLowerCase() !== String(executionLiveRecord.executionTxHash || "").toLowerCase()) {
      issue("safeTransactionService.transactionHash", "Safe Transaction Service transaction hash must match execution live record.");
    }

    const receipt = await rpcCall(rpcUrl, "eth_getTransactionReceipt", [executionLiveRecord.executionTxHash]);
    receiptStatus = String(receipt?.status || "");

    if (receiptStatus.toLowerCase() !== "0x1") {
      issue("executionReceipt.status", "Execution transaction receipt must have status 0x1.");
    }

    const finalApprovalTxs = (payload.transactions || []).filter((tx) => tx.approvalMode === "set-allowance-to-required-amount");

    if (finalApprovalTxs.length <= 0) {
      issue("payload.transactions", "No final approval transactions found.");
    }

    for (const tx of finalApprovalTxs) {
      const currentAllowanceRaw = await readTokenAllowance(rpcUrl, tx.tokenAddress, payload.liquiditySafeAddress, payload.approvalSpender);
      const currentBalanceRaw = await readTokenBalance(rpcUrl, tx.tokenAddress, payload.liquiditySafeAddress);
      const expectedAllowanceRaw = String(tx.amountRaw || "0");

      const allowanceEqualsExpected = currentAllowanceRaw === expectedAllowanceRaw;
      const allowanceMeetsOrExceedsExpected = BigInt(currentAllowanceRaw || "0") >= BigInt(expectedAllowanceRaw || "0");
      const balanceCoversExpected = BigInt(currentBalanceRaw || "0") >= BigInt(expectedAllowanceRaw || "0");

      if (!allowanceEqualsExpected) {
        issue(`allowances.${tx.symbol}.currentAllowanceRaw`, `Current allowance ${currentAllowanceRaw} does not equal expected ${expectedAllowanceRaw}.`);
      }

      if (!balanceCoversExpected) {
        issue(`allowances.${tx.symbol}.currentBalanceRaw`, `Current balance ${currentBalanceRaw} is below expected approval amount ${expectedAllowanceRaw}.`);
      }

      allowanceVerificationChecks.push({
        role: tx.role,
        symbol: tx.symbol,
        tokenAddress: tx.tokenAddress,
        liquiditySafeAddress: payload.liquiditySafeAddress,
        approvalSpender: payload.approvalSpender,
        expectedAllowanceRaw,
        expectedAllowanceHuman: tx.amountHuman || "",
        currentAllowanceRaw,
        currentBalanceRaw,
        allowanceEqualsExpected,
        allowanceMeetsOrExceedsExpected,
        balanceCoversExpected,
        tokenApprovalExecuted: true,
        allowanceVerificationPassed: allowanceEqualsExpected && allowanceMeetsOrExceedsExpected && balanceCoversExpected
      });
    }

    const poolAddress =
      postExecutionPool.summary?.poolAddress ||
      postExecutionPool.poolAddress ||
      postExecutionPool.pool?.address ||
      "";

    if (isAddress(poolAddress)) {
      poolLiquidityCurrent = await readPoolLiquidity(rpcUrl, poolAddress);
      poolLiquidityVerifiedZero = poolLiquidityCurrent === "0";

      if (!poolLiquidityVerifiedZero) {
        issue("poolLiquidityCurrent", `Pool liquidity is ${poolLiquidityCurrent}; expected 0.`);
      }
    }
  } catch (error) {
    issue("postExecutionAllowanceVerification", error.message);
  }
}

if (issues.length > 0) {
  const failed = {
    schema: "astra-dex-liquidity-token-approval-post-execution-allowances-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_TOKEN_APPROVAL_POST_EXECUTION_ALLOWANCE_VERIFICATION_FAILED",
    issues
  };

  writeJson(reportFile, failed);
  console.log(JSON.stringify(failed, null, 2));
  process.exit(1);
}

const verifiedAt = new Date().toISOString();

const allRequiredAllowancesAvailable = allowanceVerificationChecks.every((check) => check.allowanceVerificationPassed === true);
const allRequiredBalancesAvailable = allowanceVerificationChecks.every((check) => check.balanceCoversExpected === true);

const report = {
  schema: "astra-dex-liquidity-token-approval-post-execution-allowances-v0.1",
  verifiedAt,
  status: "DEX_LIQUIDITY_TOKEN_APPROVAL_POST_EXECUTION_ALLOWANCES_VERIFIED_APPROVALS_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  liquiditySafeAddress: payload.liquiditySafeAddress,
  approvalSpender: payload.approvalSpender,
  safeTxHash: executionLiveRecord.safeTxHash,
  safeNonce: executionLiveRecord.safeNonce,
  executionTxHash: executionLiveRecord.executionTxHash,
  payloadHash: payload.payloadHash,
  transactionBuilderHash: executionLiveRecord.transactionBuilderHash,
  executionReceiptStatus: receiptStatus,
  safeTransactionService: {
    safe: safeTransactionService.safe,
    nonce: safeTransactionService.nonce,
    isExecuted: safeTransactionService.isExecuted,
    transactionHash: safeTransactionService.transactionHash || null,
    executionDate: safeTransactionService.executionDate || null,
    modified: safeTransactionService.modified || null
  },
  allowanceVerificationChecks,
  tokenApprovalPostExecutionAllowanceVerificationComplete: true,
  allRequiredAllowancesAvailable,
  allRequiredBalancesAvailable,
  poolLiquidityCurrent,
  poolLiquidityVerifiedZero,
  tokenApprovalSafeExecutionLiveRecorded: true,
  tokenApprovalSafeTransactionSubmitted: true,
  tokenApprovalSafeTransactionExecuted: true,
  tokenApprovalExecuted: true,
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
  requiredBeforeLiquidityMintCalldataGenerationApproval: {
    tokenApprovalPostExecutionAllowanceVerificationComplete: true,
    tokenApprovalExecuted: true,
    allRequiredAllowancesAvailable,
    allRequiredBalancesAvailable,
    poolLiquidityStillZero: true,
    liquidityMintCalldataGenerationApprovalRecorded: false,
    liquidityMintCalldataGenerated: false,
    liquidityAdded: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    verificationOnly: true,
    generatesLiquidityCalldata: false,
    addsLiquidity: false,
    mintsPosition: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

report.verificationHash = sha256Json(report);

writeJson(reportFile, report);

const config = readJsonPath(configFile);

config.status = "token-approval-post-execution-allowances-verified-approvals-executed-no-liquidity-no-public-trading";
config.tokenApprovalPostExecutionAllowanceVerificationComplete = true;
config.allRequiredAllowancesAvailable = allRequiredAllowancesAvailable;
config.allRequiredBalancesAvailable = allRequiredBalancesAvailable;
config.tokenApprovalSafeExecutionLiveRecorded = true;
config.tokenApprovalSafeTransactionSubmitted = true;
config.tokenApprovalSafeTransactionExecuted = true;
config.tokenApprovalExecuted = true;
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
config.verifiedTokenApprovalPostExecutionAllowances = {
  verifiedAt,
  liquiditySafeAddress: report.liquiditySafeAddress,
  approvalSpender: report.approvalSpender,
  safeTxHash: report.safeTxHash,
  executionTxHash: report.executionTxHash,
  payloadHash: report.payloadHash,
  recordFile: "reports/dex-liquidity-token-approval-post-execution-allowances/dex-liquidity-token-approval-post-execution-allowances.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-token-approval-post-execution-allowances-result-v0.1",
  checkedAt: verifiedAt,
  status: report.status,
  liquiditySafeAddress: report.liquiditySafeAddress,
  approvalSpender: report.approvalSpender,
  safeTxHash: report.safeTxHash,
  executionTxHash: report.executionTxHash,
  tokenApprovalPostExecutionAllowanceVerificationComplete: true,
  allRequiredAllowancesAvailable,
  allRequiredBalancesAvailable,
  poolLiquidityVerifiedZero,
  tokenApprovalExecuted: true,
  liquidityMintCalldataGenerated: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
