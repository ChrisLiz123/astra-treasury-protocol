import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const confirm = process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_LIVE_CONFIRM || "";
const safeTxHash = process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_TX_HASH || "";
const safeNonce = process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_NONCE || "";
const safeTransactionUrl = process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_TRANSACTION_URL || "";
const submissionMethod = process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_METHOD || "";
const submittedBy = process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMITTED_BY || "";
const submittedAt = process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMITTED_AT || "";
const submissionReference = process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_REFERENCE || "";
const overwrite = process.env.OVERWRITE_DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_LIVE || "";

const requiredConfirm = "RECORD_DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_LIVE_ONLY_NOT_EXECUTION";

const recordDir = path.join(root, "reports", "dex-liquidity-funding-transfer-safe-submission-live");
const recordFile = path.join(recordDir, "dex-liquidity-funding-transfer-safe-submission-live-record.json");
const configFile = path.join(root, "configs", "dex-liquidity-funding-transfer-safe-submission-live.config.json");

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
      "User-Agent": "astra-treasury-protocol-safe-submission-live/0.1"
    }
  });

  if (!response.ok) {
    throw new Error(`GET ${url} returned HTTP ${response.status}`);
  }

  return response.json();
}

if (confirm !== requiredConfirm) {
  issue("DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_LIVE_CONFIRM", `Must equal ${requiredConfirm}.`);
}

if (!isTxHash(safeTxHash)) {
  issue("DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_TX_HASH", "Safe tx hash must be a 0x-prefixed 32-byte hash.");
}

if (!/^\d+$/.test(String(safeNonce || ""))) {
  issue("DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_NONCE", "Safe nonce must be a non-negative integer.");
}

requireUsable("DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_TRANSACTION_URL", safeTransactionUrl);
requireUsable("DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_METHOD", submissionMethod);
requireUsable("DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMITTED_BY", submittedBy);
requireUsable("DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMITTED_AT", submittedAt);
requireUsable("DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_REFERENCE", submissionReference);

if (fs.existsSync(recordFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_LIVE",
    "Live submission record already exists. Set OVERWRITE_DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_LIVE=YES only if replacing intentionally."
  );
}

const dryRunStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-submission-dry-run-status.json");
const dryRun = readJson("reports/dex-liquidity-funding-transfer-safe-submission-dry-run/dex-liquidity-funding-transfer-safe-submission-dry-run.json");
const preparationStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-submission-preparation-status.json");
const submissionApproval = readJson("public-docs/dex-liquidity-funding-transfer-safe-submission-approval-status.json");
const payloadVerificationStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-payload-verification-status.json");
const payload = readJson("reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json");
const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

if (dryRunStatus.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_DRY_RUN_COMPLETE_NOT_SUBMITTED_NO_FUNDS_MOVED") {
  issue("dryRunStatus.status", "Safe submission dry run must be complete.");
}

if (dryRunStatus.summary?.safeSubmissionDryRunComplete !== true || dryRunStatus.summary?.operatorSubmissionCommandReviewed !== true) {
  issue("dryRunStatus.summary", "Dry run and operator submission command review must be complete.");
}

if (dryRunStatus.summary?.fundingTransferSubmitted !== false || dryRunStatus.summary?.fundingTransferExecuted !== false || dryRunStatus.summary?.treasuryFundsMoved !== false) {
  issue("dryRunStatus.summary", "Dry run must show no submission, no execution, and no funds moved before live submission.");
}

if (preparationStatus.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NO_FUNDS_MOVED") {
  issue("preparationStatus.status", "Safe submission preparation must be complete.");
}

if (submissionApproval.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NO_FUNDS_MOVED") {
  issue("submissionApproval.status", "Safe submission approval must be recorded.");
}

if (payloadVerificationStatus.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_FUNDS_MOVED") {
  issue("payloadVerificationStatus.status", "Payload verification must be complete.");
}

if (payload.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_FUNDS_MOVED") {
  issue("payload.status", "Funding-transfer Safe payload must be generated and not executed.");
}

if (!isAddress(payload.sourceSafeAddress)) {
  issue("payload.sourceSafeAddress", "Source Safe address must be valid.");
}

if (!isAddress(payload.destinationSafeAddress)) {
  issue("payload.destinationSafeAddress", "Destination Safe address must be valid.");
}

if (!payload.payloadHash || payload.payloadHash !== dryRunStatus.summary?.payloadHash) {
  issue("payload.payloadHash", "Payload hash must match dry-run public status.");
}

if (postExecution.status !== "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
  issue("postExecution.status", "Post-execution pool verification must be complete.");
}

if (postExecution.summary?.liquidityVerifiedZero !== true || String(postExecution.summary?.poolLiquidity || "") !== "0") {
  issue("postExecution.summary.poolLiquidity", "Pool liquidity must remain zero.");
}

if (fullLaunch.fullLaunchApproved !== false) {
  issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
}

if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
  issue("treasuryFunding", "Global treasury funding must remain not approved and not executed.");
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
  "reports/dex-liquidity-treasury-funding/live/funds-moved.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/payload/token-approval-safe-payload.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden funds-moved/liquidity/public-trading artifact exists. Submission live must not execute, move funds, or add liquidity.");
  }
}

const txServiceBaseUrl = (
  process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_TX_SERVICE_BASE_URL ||
  "https://safe-transaction-base.safe.global/api"
).replace(/\/+$/, "");

let safeTransactionService = {};
let serviceExecutionConfirmedFalse = false;

if (issues.length === 0) {
  try {
    safeTransactionService = await fetchJson(`${txServiceBaseUrl}/v1/multisig-transactions/${safeTxHash}/`);

    if (!sameAddress(safeTransactionService.safe, payload.sourceSafeAddress)) {
      issue("safeTransactionService.safe", "Safe Transaction Service safe address does not match source Safe.");
    }

    if (Number(safeTransactionService.nonce) !== Number(safeNonce)) {
      issue("safeTransactionService.nonce", "Safe Transaction Service nonce does not match recorded nonce.");
    }

    if (safeTransactionService.isExecuted !== false) {
      issue("safeTransactionService.isExecuted", "Safe transaction must not be executed during submission-live milestone.");
    }

    if (safeTransactionService.transactionHash) {
      issue("safeTransactionService.transactionHash", "On-chain transaction hash must be empty/null before execution.");
    }

    serviceExecutionConfirmedFalse = safeTransactionService.isExecuted === false;
  } catch (error) {
    issue("safeTransactionService", error.message);
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-funding-transfer-safe-submission-live-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_LIVE_NOT_RECORDED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const recordedAt = new Date().toISOString();

const record = {
  schema: "astra-dex-liquidity-funding-transfer-safe-submission-live-record-v0.1",
  recordedAt,
  status: "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_FUNDS_MOVED",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  sourceSafeAddress: payload.sourceSafeAddress,
  destinationSafeAddress: payload.destinationSafeAddress,
  payloadReference: "reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json",
  payloadHash: payload.payloadHash,
  dryRunReference: "public-docs/dex-liquidity-funding-transfer-safe-submission-dry-run-status.json",
  safeTxHash,
  safeNonce: Number(safeNonce),
  safeTransactionUrl,
  submissionMethod,
  submittedBy,
  submittedAt,
  submissionReference,
  safeTransactionService: {
    baseUrl: txServiceBaseUrl,
    safe: safeTransactionService.safe,
    nonce: safeTransactionService.nonce,
    isExecuted: safeTransactionService.isExecuted,
    transactionHash: safeTransactionService.transactionHash || null,
    confirmationCount: Array.isArray(safeTransactionService.confirmations) ? safeTransactionService.confirmations.length : 0,
    confirmationsRequired: safeTransactionService.confirmationsRequired ?? null,
    submissionDate: safeTransactionService.submissionDate || null,
    modified: safeTransactionService.modified || null
  },
  serviceExecutionConfirmedFalse,
  safeSubmissionLiveRecorded: true,
  safeTransactionSubmitted: true,
  safeTransactionExecuted: false,
  fundingTransferSubmitted: true,
  fundingTransferExecuted: false,
  treasuryFundsMoved: false,
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
  requiredBeforePendingSignatureMonitoring: {
    safeSubmissionLiveRecorded: true,
    safeTransactionSubmitted: true,
    safeTransactionExecuted: false,
    fundingTransferExecuted: false,
    safeTxHashRecorded: true,
    safeNonceRecorded: true,
    pendingSignatureMonitoringComplete: false,
    safeExecutionApprovalRecorded: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    recordsSubmissionEvidenceOnly: true,
    submitsSafeTransactionByThisScript: false,
    executesSafeTransaction: false,
    movesTreasuryFunds: false,
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

config.status = "funding-transfer-safe-submission-live-recorded-not-executed-no-funds-moved";
config.safeSubmissionLiveRecorded = true;
config.safeTransactionSubmitted = true;
config.safeTransactionExecuted = false;
config.fundingTransferSubmitted = true;
config.fundingTransferExecuted = false;
config.treasuryFundsMoved = false;
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
config.liveSubmission = {
  recordedAt,
  sourceSafeAddress: record.sourceSafeAddress,
  destinationSafeAddress: record.destinationSafeAddress,
  safeTxHash,
  safeNonce: Number(safeNonce),
  payloadHash: record.payloadHash,
  recordFile: "reports/dex-liquidity-funding-transfer-safe-submission-live/dex-liquidity-funding-transfer-safe-submission-live-record.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-funding-transfer-safe-submission-live-result-v0.1",
  checkedAt: recordedAt,
  status: "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_FUNDS_MOVED",
  sourceSafeAddress: record.sourceSafeAddress,
  destinationSafeAddress: record.destinationSafeAddress,
  payloadHash: record.payloadHash,
  safeTxHash,
  safeNonce: Number(safeNonce),
  safeTransactionSubmitted: true,
  safeTransactionExecuted: false,
  fundingTransferExecuted: false,
  treasuryFundsMoved: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
