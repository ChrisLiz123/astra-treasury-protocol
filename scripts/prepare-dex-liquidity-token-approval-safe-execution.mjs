import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const recordDir = path.join(root, "reports", "dex-liquidity-token-approval-safe-execution-preparation");
const recordFile = path.join(recordDir, "dex-liquidity-token-approval-safe-execution-preparation.json");
const configFile = path.join(root, "configs", "dex-liquidity-token-approval-safe-execution-preparation.config.json");

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

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "astra-treasury-protocol-token-approval-safe-execution-preparation/0.1"
    }
  });

  if (!response.ok) {
    throw new Error(`GET ${url} returned HTTP ${response.status}`);
  }

  return response.json();
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

fs.mkdirSync(recordDir, { recursive: true });

const executionApprovalStatus = readJson("public-docs/dex-liquidity-token-approval-safe-execution-approval-status.json");
const executionApprovalRecord = readJson("reports/dex-liquidity-token-approval-safe-execution-approval/dex-liquidity-token-approval-safe-execution-approval-record.json");
const pendingStatus = readJson("public-docs/dex-liquidity-token-approval-safe-pending-signatures-status.json");
const pendingReport = readJson("reports/dex-liquidity-token-approval-safe-pending-signatures/dex-liquidity-token-approval-safe-pending-signatures-monitoring.json");
const liveStatus = readJson("public-docs/dex-liquidity-token-approval-safe-submission-live-status.json");
const liveRecord = readJson("reports/dex-liquidity-token-approval-safe-submission-live/dex-liquidity-token-approval-safe-submission-live-record.json");
const payload = readJson("reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json");
const verificationStatus = readJson("public-docs/dex-liquidity-token-approval-safe-payload-verification-status.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireStatus("executionApprovalStatus.status", executionApprovalStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_APPROVED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("executionApprovalRecord.status", executionApprovalRecord.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_APPROVED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("pendingStatus.status", pendingStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PENDING_SIGNATURES_THRESHOLD_REACHED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("pendingReport.status", pendingReport.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PENDING_SIGNATURES_THRESHOLD_REACHED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("liveStatus.status", liveStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("liveRecord.status", liveRecord.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("payload.status", payload.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("verificationStatus.status", verificationStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("poolStatus.status", poolStatus.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

if (executionApprovalStatus.summary?.tokenApprovalSafeExecutionApproved !== true) {
  issue("executionApprovalStatus.summary.tokenApprovalSafeExecutionApproved", "Safe execution approval must be recorded.");
}

if (executionApprovalStatus.summary?.tokenApprovalSafeTransactionExecuted !== false || executionApprovalStatus.summary?.tokenApprovalExecuted !== false || executionApprovalStatus.summary?.liquidityAdded !== false) {
  issue("executionApprovalStatus.summary.flags", "Execution approval status must show not executed, no token approval execution, and no liquidity.");
}

if (pendingStatus.summary?.thresholdReached !== true || Number(pendingStatus.summary?.missingConfirmationCount || 0) !== 0) {
  issue("pendingStatus.summary.threshold", "Pending signatures must show threshold reached and zero missing confirmations.");
}

if (pendingStatus.summary?.tokenApprovalSafeTransactionExecuted !== false || pendingStatus.summary?.tokenApprovalExecuted !== false || pendingStatus.summary?.liquidityAdded !== false) {
  issue("pendingStatus.summary.flags", "Pending signatures status must show not executed, no token approval execution, and no liquidity.");
}

if (pendingReport.safeTransactionService?.isExecuted !== false || pendingReport.safeTransactionService?.thresholdReached !== true) {
  issue("pendingReport.safeTransactionService", "Safe Transaction Service must show threshold reached and not executed.");
}

if (liveStatus.summary?.tokenApprovalSafeTransactionSubmitted !== true || liveStatus.summary?.tokenApprovalSafeTransactionExecuted !== false) {
  issue("liveStatus.summary", "Live submission must show submitted/proposed and not executed.");
}

if (!isAddress(payload.liquiditySafeAddress) || !isAddress(payload.approvalSpender)) {
  issue("payload.addresses", "Payload liquidity Safe and approval spender must be valid.");
}

if (payload.payloadHash !== executionApprovalRecord.payloadHash || payload.payloadHash !== pendingReport.payloadHash || payload.payloadHash !== liveRecord.payloadHash) {
  issue("payload.payloadHash", "Payload hash must match execution approval, pending report, and live record.");
}

if (String(liveRecord.safeTxHash) !== String(executionApprovalRecord.safeTxHash) || String(liveRecord.safeTxHash) !== String(pendingReport.safeTxHash)) {
  issue("safeTxHash", "Safe tx hash must match across live, pending, and execution approval records.");
}

if (Number(liveRecord.safeNonce) !== Number(executionApprovalRecord.safeNonce) || Number(liveRecord.safeNonce) !== Number(pendingReport.safeNonce)) {
  issue("safeNonce", "Safe nonce must match across live, pending, and execution approval records.");
}

if (poolStatus.summary?.liquidityVerifiedZero !== true || String(poolStatus.summary?.poolLiquidity || "") !== "0") {
  issue("poolStatus.summary.poolLiquidity", "Pool liquidity must remain zero.");
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

if (monitor.status !== "PASS") {
  issue("monitor.status", `Expected PASS, got ${monitor.status}.`);
}

if (alerts.responseRequired === true) {
  issue("alerts.responseRequired", "Alerts must not require response.");
}

if (Number(incidents?.summary?.active || 0) !== 0) {
  issue("incidents.summary.active", "Active incidents must be zero.");
}

if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
  issue("execution.mode", "Mainnet execution queue must remain disabled.");
}

const forbiddenFiles = [
  "reports/dex-liquidity-token-approval/live/token-approval-executed.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden token-approval-executed/liquidity/public-trading artifact exists. Execution preparation must not execute approvals or add liquidity.");
  }
}

const txServiceBaseUrl = (
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_TX_SERVICE_BASE_URL ||
  "https://safe-transaction-base.safe.global/api"
).replace(/\/+$/, "");

const rpcUrl =
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_PREPARATION_RPC_URL ||
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_PENDING_SIGNATURES_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_PREPARATION_RPC_URL", "RPC URL must be available and start with https://.");
}

let safeTransactionService = {};
let serviceThresholdReached = false;
let serviceExecutionConfirmedFalse = false;
let executionReadinessChecks = [];

if (issues.length === 0) {
  try {
    safeTransactionService = await fetchJson(`${txServiceBaseUrl}/v1/multisig-transactions/${liveRecord.safeTxHash}/`);

    if (!sameAddress(safeTransactionService.safe, payload.liquiditySafeAddress)) {
      issue("safeTransactionService.safe", "Safe Transaction Service safe address does not match liquidity Safe.");
    }

    if (Number(safeTransactionService.nonce) !== Number(liveRecord.safeNonce)) {
      issue("safeTransactionService.nonce", "Safe Transaction Service nonce does not match recorded nonce.");
    }

    if (safeTransactionService.isExecuted !== false) {
      issue("safeTransactionService.isExecuted", "Safe transaction must not be executed during execution preparation.");
    }

    if (safeTransactionService.transactionHash) {
      issue("safeTransactionService.transactionHash", "On-chain transaction hash must be empty/null before execution.");
    }

    const confirmationCount = Array.isArray(safeTransactionService.confirmations) ? safeTransactionService.confirmations.length : 0;
    const requiredThreshold = Number(safeTransactionService.confirmationsRequired ?? pendingReport.safeTransactionService?.requiredThreshold ?? 0);

    serviceThresholdReached = requiredThreshold > 0 && confirmationCount >= requiredThreshold;
    serviceExecutionConfirmedFalse = safeTransactionService.isExecuted === false;

    if (!serviceThresholdReached) {
      issue("safeTransactionService.thresholdReached", "Safe Transaction Service no longer shows threshold reached.");
    }

    for (const tx of payload.transactions || []) {
      const currentBalanceRaw = await readTokenBalance(rpcUrl, tx.tokenAddress, payload.liquiditySafeAddress);
      const currentAllowanceRaw = await readTokenAllowance(rpcUrl, tx.tokenAddress, payload.liquiditySafeAddress, payload.approvalSpender);

      const allowanceStillUnexecuted = String(currentAllowanceRaw) === String(tx.currentAllowanceRaw || currentAllowanceRaw);
      const balanceCoversFinalApproval = tx.approvalMode === "set-allowance-to-required-amount"
        ? BigInt(currentBalanceRaw || "0") >= BigInt(tx.amountRaw || "0")
        : true;

      if (!allowanceStillUnexecuted) {
        issue(`transactions.${tx.id}.currentAllowanceRaw`, `Current allowance ${currentAllowanceRaw} differs from recorded pre-execution allowance ${tx.currentAllowanceRaw}.`);
      }

      if (!balanceCoversFinalApproval) {
        issue(`transactions.${tx.id}.currentBalanceRaw`, `Current balance ${currentBalanceRaw} is below final approval amount ${tx.amountRaw}.`);
      }

      executionReadinessChecks.push({
        id: tx.id,
        role: tx.role,
        symbol: tx.symbol,
        tokenAddress: tx.tokenAddress,
        approvalMode: tx.approvalMode,
        amountRaw: tx.amountRaw,
        amountHuman: tx.amountHuman,
        liquiditySafeAddress: payload.liquiditySafeAddress,
        approvalSpender: payload.approvalSpender,
        currentBalanceRaw,
        currentAllowanceRaw,
        recordedCurrentAllowanceRaw: tx.currentAllowanceRaw || "",
        allowanceStillUnexecuted,
        balanceCoversFinalApproval,
        tokenApprovalSafeTransactionExecuted: false,
        tokenApprovalExecuted: false
      });
    }
  } catch (error) {
    issue("executionPreparation", error.message);
  }
}

if (issues.length > 0) {
  const failed = {
    schema: "astra-dex-liquidity-token-approval-safe-execution-preparation-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_NOT_PREPARED",
    issues
  };

  writeJson(recordFile, failed);
  console.log(JSON.stringify(failed, null, 2));
  process.exit(1);
}

const preparedAt = new Date().toISOString();

const record = {
  schema: "astra-dex-liquidity-token-approval-safe-execution-preparation-v0.1",
  preparedAt,
  status: "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_PREPARED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  liquiditySafeAddress: payload.liquiditySafeAddress,
  approvalSpender: payload.approvalSpender,
  safeTxHash: liveRecord.safeTxHash,
  safeNonce: liveRecord.safeNonce,
  safeTransactionUrl: liveRecord.safeTransactionUrl,
  payloadHash: payload.payloadHash,
  transactionBuilderHash: liveRecord.transactionBuilderHash,
  executionApprovalReference: "public-docs/dex-liquidity-token-approval-safe-execution-approval-status.json",
  pendingSignaturesReference: "public-docs/dex-liquidity-token-approval-safe-pending-signatures-status.json",
  liveSubmissionReference: "public-docs/dex-liquidity-token-approval-safe-submission-live-status.json",
  payloadReference: "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json",
  safeTransactionService: {
    baseUrl: txServiceBaseUrl,
    safe: safeTransactionService.safe,
    nonce: safeTransactionService.nonce,
    isExecuted: safeTransactionService.isExecuted,
    transactionHash: safeTransactionService.transactionHash || null,
    confirmationCount: Array.isArray(safeTransactionService.confirmations) ? safeTransactionService.confirmations.length : 0,
    confirmationsRequired: safeTransactionService.confirmationsRequired ?? pendingReport.safeTransactionService?.requiredThreshold ?? null,
    submissionDate: safeTransactionService.submissionDate || null,
    modified: safeTransactionService.modified || null
  },
  serviceThresholdReached,
  serviceExecutionConfirmedFalse,
  executionReadinessChecks,
  tokenApprovalSafeExecutionPreparationComplete: true,
  operatorExecutionCommandReviewed: true,
  operatorInstruction: "In the live execution milestone, execute only the recorded token-approval Safe transaction hash from the liquidity Safe on Base. Do not execute unrelated transactions. Record execution evidence immediately after execution. Do not generate liquidity calldata or add liquidity in the execution step.",
  requiredBeforeTokenApprovalSafeExecutionLive: {
    tokenApprovalSafeExecutionPreparationComplete: true,
    operatorExecutionCommandReviewed: true,
    tokenApprovalSafeExecutionApprovalRecorded: true,
    pendingSignatureMonitoringComplete: true,
    thresholdReached: true,
    tokenApprovalSafeTransactionSubmitted: true,
    tokenApprovalSafeTransactionExecuted: false,
    tokenApprovalExecuted: false,
    safeTxHashRecorded: true,
    safeNonceRecorded: true,
    publicStatusUpdatePrepared: false
  },
  flags: {
    tokenApprovalSafeExecutionPreparationComplete: true,
    operatorExecutionCommandReviewed: true,
    pendingSignatureMonitoringComplete: true,
    thresholdReached: true,
    tokenApprovalSafeExecutionApprovalRecorded: true,
    tokenApprovalSafeExecutionApproved: true,
    tokenApprovalSafeSubmissionLiveRecorded: true,
    tokenApprovalSafeTransactionSubmitted: true,
    tokenApprovalSafeTransactionExecuted: false,
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
    fullLaunchApproved: false
  },
  safety: {
    preparationOnly: true,
    executesSafeTransactionByThisScript: false,
    executesTokenApproval: false,
    generatesLiquidityCalldata: false,
    addsLiquidity: false,
    mintsPosition: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

record.preparationHash = sha256Json(record);

writeJson(recordFile, record);

const config = readJsonPath(configFile);

config.status = "token-approval-safe-execution-prepared-not-executed-no-approvals-executed-no-liquidity";
config.tokenApprovalSafeExecutionPreparationComplete = true;
config.operatorExecutionCommandReviewed = true;
config.pendingSignatureMonitoringComplete = true;
config.thresholdReached = true;
config.tokenApprovalSafeExecutionApprovalRecorded = true;
config.tokenApprovalSafeExecutionApproved = true;
config.tokenApprovalSafeSubmissionLiveRecorded = true;
config.tokenApprovalSafeTransactionSubmitted = true;
config.tokenApprovalSafeTransactionExecuted = false;
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
config.preparedTokenApprovalSafeExecution = {
  preparedAt,
  liquiditySafeAddress: record.liquiditySafeAddress,
  approvalSpender: record.approvalSpender,
  safeTxHash: record.safeTxHash,
  safeNonce: record.safeNonce,
  payloadHash: record.payloadHash,
  transactionBuilderHash: record.transactionBuilderHash,
  recordFile: "reports/dex-liquidity-token-approval-safe-execution-preparation/dex-liquidity-token-approval-safe-execution-preparation.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-token-approval-safe-execution-preparation-result-v0.1",
  checkedAt: preparedAt,
  status: record.status,
  liquiditySafeAddress: record.liquiditySafeAddress,
  approvalSpender: record.approvalSpender,
  safeTxHash: record.safeTxHash,
  safeNonce: record.safeNonce,
  serviceThresholdReached,
  serviceExecutionConfirmedFalse,
  tokenApprovalSafeExecutionPreparationComplete: true,
  tokenApprovalSafeTransactionExecuted: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
