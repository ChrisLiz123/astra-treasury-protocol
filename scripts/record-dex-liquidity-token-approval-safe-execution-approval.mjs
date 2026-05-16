import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const confirm = process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_APPROVAL_CONFIRM || "";
const approver = process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_APPROVER || "";
const approvalReference = process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_APPROVAL_REFERENCE || "";
const overwrite = process.env.OVERWRITE_DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_APPROVAL || "";

const requiredConfirm = "APPROVE_DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_ONLY_NOT_EXECUTED_BY_SCRIPT";

const recordDir = path.join(root, "reports", "dex-liquidity-token-approval-safe-execution-approval");
const recordFile = path.join(recordDir, "dex-liquidity-token-approval-safe-execution-approval-record.json");
const configFile = path.join(root, "configs", "dex-liquidity-token-approval-safe-execution-approval.config.json");

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

function isTxHash(value) {
  return /^0x[0-9a-fA-F]{64}$/.test(String(value || "").trim());
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
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

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "astra-treasury-protocol-token-approval-safe-execution-approval/0.1"
    }
  });

  if (!response.ok) {
    throw new Error(`GET ${url} returned HTTP ${response.status}`);
  }

  return response.json();
}

if (confirm !== requiredConfirm) {
  issue("DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_APPROVAL_CONFIRM", `Must equal ${requiredConfirm}.`);
}

requireUsable("DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_APPROVER", approver);
requireUsable("DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_APPROVAL_REFERENCE", approvalReference);

if (fs.existsSync(recordFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_APPROVAL",
    "Execution approval record already exists. Set OVERWRITE_DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_APPROVAL=YES only if replacing intentionally."
  );
}

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

if (pendingStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PENDING_SIGNATURES_THRESHOLD_REACHED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
  issue("pendingStatus.status", "Pending signatures status must show threshold reached and not executed.");
}

if (pendingStatus.summary?.pendingSignatureMonitoringComplete !== true) {
  issue("pendingStatus.summary.pendingSignatureMonitoringComplete", "Pending signature monitoring must be complete.");
}

if (pendingStatus.summary?.thresholdReached !== true || Number(pendingStatus.summary?.missingConfirmationCount || 0) !== 0) {
  issue("pendingStatus.summary.threshold", "Threshold must be reached and missing confirmations must be zero.");
}

if (pendingStatus.summary?.tokenApprovalSafeTransactionExecuted !== false || pendingStatus.summary?.tokenApprovalExecuted !== false || pendingStatus.summary?.liquidityAdded !== false) {
  issue("pendingStatus.summary.flags", "Pending signatures status must show not executed, no approval execution, and no liquidity.");
}

if (pendingReport.safeTransactionService?.thresholdReached !== true || pendingReport.safeTransactionService?.isExecuted !== false) {
  issue("pendingReport.safeTransactionService", "Safe Transaction Service must show threshold reached and not executed.");
}

if (liveStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
  issue("liveStatus.status", "Token approval Safe live submission evidence must be recorded.");
}

if (!isTxHash(liveRecord.safeTxHash)) {
  issue("liveRecord.safeTxHash", "Safe tx hash must be valid.");
}

if (!Number.isInteger(liveRecord.safeNonce) || liveRecord.safeNonce < 0) {
  issue("liveRecord.safeNonce", "Safe nonce must be valid.");
}

if (!isAddress(payload.liquiditySafeAddress) || !isAddress(payload.approvalSpender)) {
  issue("payload.addresses", "Payload liquidity Safe and approval spender must be valid.");
}

if (payload.payloadHash !== pendingReport.payloadHash || payload.payloadHash !== liveRecord.payloadHash) {
  issue("payload.payloadHash", "Payload hash must match pending monitoring and live submission record.");
}

if (verificationStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
  issue("verificationStatus.status", "Token approval Safe payload verification must be complete.");
}

if (poolStatus.status !== "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
  issue("poolStatus.status", "Pool must remain no-liquidity/no-public-trading.");
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
    issue(file, "Forbidden token-approval-executed/liquidity/public-trading artifact exists. Approval milestone must not execute approvals or add liquidity.");
  }
}

for (const check of pendingReport.approvalStateChecks || []) {
  if (check.allowanceStillUnexecuted !== true || check.tokenApprovalExecuted !== false) {
    issue(`pendingReport.approvalStateChecks.${check.id}`, "Allowance must remain unexecuted and token approval must remain false.");
  }
}

const txServiceBaseUrl = (
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_TX_SERVICE_BASE_URL ||
  "https://safe-transaction-base.safe.global/api"
).replace(/\/+$/, "");

let safeTransactionService = {};
let serviceThresholdReached = false;
let serviceExecutionConfirmedFalse = false;

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
      issue("safeTransactionService.isExecuted", "Safe transaction must not be executed before execution approval.");
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
  } catch (error) {
    issue("safeTransactionService", error.message);
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-token-approval-safe-execution-approval-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_NOT_APPROVED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const recordedAt = new Date().toISOString();

const record = {
  schema: "astra-dex-liquidity-token-approval-safe-execution-approval-record-v0.1",
  recordedAt,
  status: "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_APPROVED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY",
  approvalScope: "token-approval-safe-execution-approved-for-later-step-not-executed-by-this-script",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  approver,
  approvalReference,
  liquiditySafeAddress: payload.liquiditySafeAddress,
  approvalSpender: payload.approvalSpender,
  payloadHash: payload.payloadHash,
  transactionBuilderHash: liveRecord.transactionBuilderHash,
  pendingSignaturesReference: "public-docs/dex-liquidity-token-approval-safe-pending-signatures-status.json",
  liveSubmissionReference: "public-docs/dex-liquidity-token-approval-safe-submission-live-status.json",
  payloadReference: "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json",
  safeTxHash: liveRecord.safeTxHash,
  safeNonce: liveRecord.safeNonce,
  safeTransactionUrl: liveRecord.safeTransactionUrl,
  confirmationCount: pendingReport.safeTransactionService.confirmationCount,
  requiredThreshold: pendingReport.safeTransactionService.requiredThreshold,
  missingConfirmationCount: pendingReport.safeTransactionService.missingConfirmationCount,
  thresholdReached: true,
  safeTransactionService: {
    baseUrl: txServiceBaseUrl,
    safe: safeTransactionService.safe,
    nonce: safeTransactionService.nonce,
    isExecuted: safeTransactionService.isExecuted,
    transactionHash: safeTransactionService.transactionHash || null,
    submissionDate: safeTransactionService.submissionDate || null,
    modified: safeTransactionService.modified || null
  },
  serviceThresholdReached,
  serviceExecutionConfirmedFalse,
  tokenApprovalSafeExecutionApprovalRecorded: true,
  tokenApprovalSafeExecutionApproved: true,
  pendingSignatureMonitoringComplete: true,
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
  fullLaunchApproved: false,
  requiredBeforeTokenApprovalSafeExecutionPreparation: {
    tokenApprovalSafeExecutionApprovalRecorded: true,
    pendingSignatureMonitoringComplete: true,
    thresholdReached: true,
    tokenApprovalSafeTransactionSubmitted: true,
    tokenApprovalSafeTransactionExecuted: false,
    tokenApprovalExecuted: false,
    safeTxHashRecorded: true,
    safeNonceRecorded: true,
    operatorExecutionCommandReviewed: false,
    safeExecutionPreparationComplete: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    approvalOnly: true,
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

writeJson(recordFile, record);

const config = readJsonPath(configFile);

config.status = "token-approval-safe-execution-approved-not-executed-no-approvals-executed-no-liquidity";
config.tokenApprovalSafeExecutionApprovalRecorded = true;
config.tokenApprovalSafeExecutionApproved = true;
config.pendingSignatureMonitoringComplete = true;
config.thresholdReached = true;
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
config.approvedTokenApprovalSafeExecution = {
  recordedAt,
  approver,
  approvalReference,
  liquiditySafeAddress: record.liquiditySafeAddress,
  approvalSpender: record.approvalSpender,
  safeTxHash: record.safeTxHash,
  safeNonce: record.safeNonce,
  payloadHash: record.payloadHash,
  recordFile: "reports/dex-liquidity-token-approval-safe-execution-approval/dex-liquidity-token-approval-safe-execution-approval-record.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-token-approval-safe-execution-approval-result-v0.1",
  checkedAt: recordedAt,
  status: record.status,
  liquiditySafeAddress: record.liquiditySafeAddress,
  approvalSpender: record.approvalSpender,
  safeTxHash: record.safeTxHash,
  safeNonce: record.safeNonce,
  thresholdReached: true,
  tokenApprovalSafeExecutionApproved: true,
  tokenApprovalSafeTransactionExecuted: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
