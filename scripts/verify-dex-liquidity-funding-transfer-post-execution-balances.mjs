import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const reportDir = path.join(root, "reports", "dex-liquidity-funding-transfer-post-execution-balances");
const reportFile = path.join(reportDir, "dex-liquidity-funding-transfer-post-execution-balances.json");
const configFile = path.join(root, "configs", "dex-liquidity-funding-transfer-post-execution-balances.config.json");

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
      "User-Agent": "astra-treasury-protocol-post-execution-balances/0.1"
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

const executionLiveStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-execution-live-status.json");
const executionLiveRecord = readJson("reports/dex-liquidity-funding-transfer-safe-execution-live/dex-liquidity-funding-transfer-safe-execution-live-record.json");
const fundsMoved = readJson("reports/dex-liquidity-treasury-funding/live/funds-moved.json");
const payload = readJson("reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json");
const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireStatus("executionLiveStatus.status", executionLiveStatus.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_EXECUTION_LIVE_RECORDED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("executionLiveRecord.status", executionLiveRecord.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_EXECUTION_LIVE_RECORDED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("fundsMoved.status", fundsMoved.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_EXECUTED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("payload.status", payload.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_FUNDS_MOVED");

if (executionLiveStatus.summary?.safeTransactionExecuted !== true || executionLiveStatus.summary?.fundingTransferExecuted !== true || executionLiveStatus.summary?.treasuryFundsMoved !== true) {
  issue("executionLiveStatus.summary", "Execution live status must show Safe executed, funding transfer executed, and treasury funds moved.");
}

if (executionLiveStatus.summary?.tokenApprovalExecuted !== false || executionLiveStatus.summary?.liquidityAdded !== false || executionLiveStatus.summary?.publicTradingApproved !== false || executionLiveStatus.summary?.fullLaunchApproved !== false) {
  issue("executionLiveStatus.summary.restrictions", "Token approval, liquidity, public trading, and full launch must remain false.");
}

if (!isAddress(executionLiveRecord.sourceSafeAddress) || !isAddress(executionLiveRecord.destinationSafeAddress)) {
  issue("executionLiveRecord.safeAddresses", "Source and destination Safe addresses must be valid.");
}

if (!isTxHash(executionLiveRecord.executionTxHash)) {
  issue("executionLiveRecord.executionTxHash", "Execution transaction hash must be valid.");
}

if (executionLiveRecord.payloadHash !== payload.payloadHash || executionLiveRecord.payloadHash !== fundsMoved.payloadHash) {
  issue("payloadHash", "Execution live, funds moved, and payload hashes must match.");
}

if (!sameAddress(executionLiveRecord.sourceSafeAddress, payload.sourceSafeAddress) || !sameAddress(executionLiveRecord.destinationSafeAddress, payload.destinationSafeAddress)) {
  issue("payload.safeAddresses", "Payload source/destination must match execution live record.");
}

if (postExecution.status !== "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
  issue("postExecution.status", "Pool post-execution verification must still be the no-liquidity public-trading-safe state.");
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
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden liquidity/public-trading artifact exists. Post-execution balance verification must not add liquidity or enable public trading.");
  }
}

const rpcUrl =
  process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_RPC_URL ||
  process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_EXECUTION_LIVE_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_LIQUIDITY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_RPC_URL", "RPC URL must be available and start with https://.");
}

const txServiceBaseUrl = (
  process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_TX_SERVICE_BASE_URL ||
  "https://safe-transaction-base.safe.global/api"
).replace(/\/+$/, "");

let safeTransactionService = {};
let balanceVerificationChecks = [];
let poolLiquidityCurrent = String(postExecution.summary?.poolLiquidity || "0");
let poolLiquidityVerifiedZero = false;
let executionReceiptStatus = "";

if (issues.length === 0) {
  try {
    safeTransactionService = await fetchJson(`${txServiceBaseUrl}/v1/multisig-transactions/${executionLiveRecord.safeTxHash}/`);

    if (safeTransactionService.isExecuted !== true) {
      issue("safeTransactionService.isExecuted", "Safe Transaction Service must still show executed.");
    }

    if (!isTxHash(safeTransactionService.transactionHash || "")) {
      issue("safeTransactionService.transactionHash", "Safe Transaction Service must expose execution tx hash.");
    }

    if (String(safeTransactionService.transactionHash || "").toLowerCase() !== String(executionLiveRecord.executionTxHash || "").toLowerCase()) {
      issue("safeTransactionService.transactionHash", "Safe Transaction Service transactionHash must match execution live record.");
    }

    const receipt = await rpcCall(rpcUrl, "eth_getTransactionReceipt", [executionLiveRecord.executionTxHash]);
    executionReceiptStatus = String(receipt?.status || "");

    if (executionReceiptStatus.toLowerCase() !== "0x1") {
      issue("executionReceipt.status", "Execution transaction receipt must exist and have status 0x1.");
    }

    for (const check of fundsMoved.executionBalanceChecks || []) {
      const sourceCurrentRaw = await readTokenBalance(rpcUrl, check.tokenAddress, executionLiveRecord.sourceSafeAddress);
      const destinationCurrentRaw = await readTokenBalance(rpcUrl, check.tokenAddress, executionLiveRecord.destinationSafeAddress);

      const sourceStillAtExpectedAfter = String(sourceCurrentRaw) === String(check.expectedSourceAfterRaw);
      const destinationStillAtExpectedAfter = String(destinationCurrentRaw) === String(check.expectedDestinationAfterRaw);
      const destinationFundedAtLeastAmount = BigInt(destinationCurrentRaw || "0") >= BigInt(check.amountRaw || "0");

      if (!sourceStillAtExpectedAfter) {
        issue(`balances.${check.id}.sourceCurrentRaw`, `Current source balance ${sourceCurrentRaw} does not equal expected post-execution balance ${check.expectedSourceAfterRaw}.`);
      }

      if (!destinationStillAtExpectedAfter) {
        issue(`balances.${check.id}.destinationCurrentRaw`, `Current destination balance ${destinationCurrentRaw} does not equal expected post-execution balance ${check.expectedDestinationAfterRaw}.`);
      }

      if (!destinationFundedAtLeastAmount) {
        issue(`balances.${check.id}.destinationFundedAtLeastAmount`, "Destination balance is below transferred amount.");
      }

      balanceVerificationChecks.push({
        id: check.id,
        role: check.role,
        symbol: check.symbol,
        tokenAddress: check.tokenAddress,
        amountRaw: check.amountRaw,
        amountHuman: check.amountHuman,
        sourceBeforeRaw: check.sourceBeforeRaw,
        sourceExpectedAfterRaw: check.expectedSourceAfterRaw,
        sourceCurrentRaw,
        sourceStillAtExpectedAfter,
        destinationBeforeRaw: check.destinationBeforeRaw,
        destinationExpectedAfterRaw: check.expectedDestinationAfterRaw,
        destinationCurrentRaw,
        destinationStillAtExpectedAfter,
        destinationFundedAtLeastAmount,
        balanceVerificationPassed: sourceStillAtExpectedAfter && destinationStillAtExpectedAfter && destinationFundedAtLeastAmount
      });
    }

    const poolAddress =
      postExecution.summary?.poolAddress ||
      postExecution.poolAddress ||
      postExecution.pool?.address ||
      "";

    if (poolAddress && isAddress(poolAddress)) {
      poolLiquidityCurrent = await readPoolLiquidity(rpcUrl, poolAddress);
      poolLiquidityVerifiedZero = poolLiquidityCurrent === "0";

      if (!poolLiquidityVerifiedZero) {
        issue("poolLiquidityCurrent", `Pool liquidity is ${poolLiquidityCurrent}; expected 0.`);
      }
    } else {
      poolLiquidityVerifiedZero = String(postExecution.summary?.poolLiquidity || "0") === "0";
    }
  } catch (error) {
    issue("postExecutionBalanceVerification", error.message);
  }
}

if (issues.length > 0) {
  const failed = {
    schema: "astra-dex-liquidity-funding-transfer-post-execution-balances-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_POST_EXECUTION_BALANCE_VERIFICATION_FAILED",
    issues
  };

  writeJson(reportFile, failed);
  console.log(JSON.stringify(failed, null, 2));
  process.exit(1);
}

const verifiedAt = new Date().toISOString();

const report = {
  schema: "astra-dex-liquidity-funding-transfer-post-execution-balances-v0.1",
  verifiedAt,
  status: "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_VERIFIED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  sourceSafeAddress: executionLiveRecord.sourceSafeAddress,
  destinationSafeAddress: executionLiveRecord.destinationSafeAddress,
  safeTxHash: executionLiveRecord.safeTxHash,
  safeNonce: executionLiveRecord.safeNonce,
  executionTxHash: executionLiveRecord.executionTxHash,
  payloadHash: executionLiveRecord.payloadHash,
  executionReceiptStatus,
  safeTransactionService: {
    safe: safeTransactionService.safe,
    nonce: safeTransactionService.nonce,
    isExecuted: safeTransactionService.isExecuted,
    transactionHash: safeTransactionService.transactionHash || null,
    executionDate: safeTransactionService.executionDate || null,
    modified: safeTransactionService.modified || null
  },
  balanceVerificationChecks,
  poolLiquidityCurrent,
  poolLiquidityVerifiedZero,
  postExecutionBalanceVerificationComplete: true,
  sourceBalancesMovedAsExpected: true,
  destinationBalancesFunded: true,
  safeTransactionExecuted: true,
  fundingTransferExecuted: true,
  treasuryFundsMoved: true,
  globalTreasuryFundingApproved: false,
  globalTreasuryFundingExecuted: false,
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
    fundingTransferExecuted: true,
    treasuryFundsMoved: true,
    destinationBalancesFunded: true,
    poolLiquidityStillZero: true,
    tokenApprovalRequirementsRecheckComplete: false,
    tokenApprovalPayloadGenerationApprovalRecorded: false,
    liquidityPayloadGenerationApprovalRecorded: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    verificationOnly: true,
    executesTokenApproval: false,
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

config.status = "funding-transfer-post-execution-balances-verified-funds-moved-no-liquidity-no-public-trading";
config.postExecutionBalanceVerificationComplete = true;
config.destinationBalancesFunded = true;
config.sourceBalancesMovedAsExpected = true;
config.safeTransactionSubmitted = true;
config.safeTransactionExecuted = true;
config.fundingTransferSubmitted = true;
config.fundingTransferExecuted = true;
config.treasuryFundsMoved = true;
config.globalTreasuryFundingApproved = false;
config.globalTreasuryFundingExecuted = false;
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
config.verifiedFundingTransferPostExecutionBalances = {
  verifiedAt,
  sourceSafeAddress: report.sourceSafeAddress,
  destinationSafeAddress: report.destinationSafeAddress,
  safeTxHash: report.safeTxHash,
  executionTxHash: report.executionTxHash,
  payloadHash: report.payloadHash,
  recordFile: "reports/dex-liquidity-funding-transfer-post-execution-balances/dex-liquidity-funding-transfer-post-execution-balances.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-funding-transfer-post-execution-balances-result-v0.1",
  checkedAt: verifiedAt,
  status: report.status,
  sourceSafeAddress: report.sourceSafeAddress,
  destinationSafeAddress: report.destinationSafeAddress,
  safeTxHash: report.safeTxHash,
  executionTxHash: report.executionTxHash,
  postExecutionBalanceVerificationComplete: true,
  sourceBalancesMovedAsExpected: true,
  destinationBalancesFunded: true,
  poolLiquidityVerifiedZero,
  fundingTransferExecuted: true,
  treasuryFundsMoved: true,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
