import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const recordDir = path.join(root, "reports", "dex-liquidity-funding-transfer-safe-submission-preparation");
const recordFile = path.join(recordDir, "dex-liquidity-funding-transfer-safe-submission-preparation.json");
const configFile = path.join(root, "configs", "dex-liquidity-funding-transfer-safe-submission-preparation.config.json");

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

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function isZeroAddress(value) {
  return String(value || "").toLowerCase() === "0x0000000000000000000000000000000000000000";
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

const submissionApproval = readJson("public-docs/dex-liquidity-funding-transfer-safe-submission-approval-status.json");
const submissionApprovalRecord = readJson("reports/dex-liquidity-funding-transfer-safe-submission-approval/dex-liquidity-funding-transfer-safe-submission-approval-record.json");
const payloadVerificationStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-payload-verification-status.json");
const payloadVerification = readJson("reports/dex-liquidity-funding-transfer-safe-payload-verification/dex-liquidity-funding-transfer-safe-payload-verification.json");
const payloadStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-payload-status.json");
const payload = readJson("reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json");
const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireStatus("submissionApproval.status", submissionApproval.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NO_FUNDS_MOVED");
requireStatus("payloadVerificationStatus.status", payloadVerificationStatus.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_FUNDS_MOVED");
requireStatus("payloadStatus.status", payloadStatus.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_FUNDS_MOVED");
requireStatus("payload.status", payload.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_FUNDS_MOVED");
requireStatus("postExecution.status", postExecution.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

if (submissionApproval.summary?.fundingTransferSafeSubmissionApproved !== true) {
  issue("submissionApproval.summary.fundingTransferSafeSubmissionApproved", "Safe submission approval must be recorded.");
}

if (submissionApproval.summary?.fundingTransferSubmitted !== false || submissionApproval.summary?.fundingTransferExecuted !== false || submissionApproval.summary?.treasuryFundsMoved !== false) {
  issue("submissionApproval.summary", "Submission approval must show not submitted, not executed, and no treasury funds moved.");
}

if (payloadVerificationStatus.summary?.fundingTransferSafePayloadVerified !== true || payloadVerificationStatus.summary?.payloadHashVerified !== true) {
  issue("payloadVerificationStatus.summary", "Payload must be verified and payload hash must verify.");
}

if (payloadVerificationStatus.summary?.fundingTransferSubmitted !== false || payloadVerificationStatus.summary?.fundingTransferExecuted !== false || payloadVerificationStatus.summary?.treasuryFundsMoved !== false) {
  issue("payloadVerificationStatus.summary", "Payload verification must show not submitted, not executed, and no treasury funds moved.");
}

if (payload.flags?.fundingTransferSubmitted !== false || payload.flags?.fundingTransferExecuted !== false || payload.flags?.treasuryFundsMoved !== false) {
  issue("payload.flags", "Payload must remain not submitted, not executed, and no treasury funds moved.");
}

if (!isAddress(payload.sourceSafeAddress) || isZeroAddress(payload.sourceSafeAddress)) {
  issue("payload.sourceSafeAddress", "Source Safe must be a valid non-zero address.");
}

if (!isAddress(payload.destinationSafeAddress) || isZeroAddress(payload.destinationSafeAddress)) {
  issue("payload.destinationSafeAddress", "Destination Safe must be a valid non-zero address.");
}

if (!payload.payloadHash || payload.payloadHash !== payloadVerificationStatus.summary?.payloadHash) {
  issue("payload.payloadHash", "Payload hash must match verified status.");
}

if (!Array.isArray(payload.transactions) || payload.transactions.length <= 0) {
  issue("payload.transactions", "Payload must contain transfer transactions.");
}

if (!Array.isArray(payloadVerification.transactionChecks) || payloadVerification.transactionChecks.length <= 0) {
  issue("payloadVerification.transactionChecks", "Payload verification checks must be present.");
}

for (const check of payloadVerification.transactionChecks || []) {
  if (check.calldataVerified !== true || check.amountMatchesShortfall !== true || check.sourceBalanceCoversTransfer !== true || check.destinationBalanceUnchanged !== true) {
    issue(`payloadVerification.transactionChecks.${check.id}`, "All verification checks must pass.");
  }
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
  "reports/dex-liquidity-funding-transfer-safe-submission-live/dex-liquidity-funding-transfer-safe-submission-live-record.json",
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
    issue(file, "Forbidden live/submission/liquidity/public-trading artifact exists. Preparation must not submit, move funds, or add liquidity.");
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-funding-transfer-safe-submission-preparation-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_NOT_PREPARED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const preparedAt = new Date().toISOString();
const sourceSafeAddress = payload.sourceSafeAddress;
const destinationSafeAddress = payload.destinationSafeAddress;

const preparedTransactions = payload.transactions.map((tx, index) => ({
  index,
  id: tx.id,
  role: tx.role,
  symbol: tx.symbol,
  tokenAddress: tx.tokenAddress,
  safeAddress: sourceSafeAddress,
  to: tx.to,
  value: tx.value,
  data: tx.data,
  dataHash: tx.dataHash,
  operation: tx.operation,
  operationValue: tx.operationValue,
  functionSignature: tx.functionSignature,
  recipient: tx.recipient,
  amountRaw: tx.amountRaw,
  amountHuman: tx.amountHuman,
  transactionBuilderFields: {
    to: tx.to,
    value: tx.value,
    data: tx.data,
    operation: "CALL"
  },
  fundingTransferSubmitted: false,
  fundingTransferExecuted: false
}));

const record = {
  schema: "astra-dex-liquidity-funding-transfer-safe-submission-preparation-v0.1",
  preparedAt,
  status: "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NO_FUNDS_MOVED",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  sourceSafeAddress,
  destinationSafeAddress,
  sourceSafeQueueUrl: `https://app.safe.global/transactions/queue?safe=base:${sourceSafeAddress}`,
  safeUiInstruction: "Open the source Safe on Base, create/propose a transaction batch using the prepared transaction-builder fields, and stop after proposing/submitting. Do not execute.",
  payloadReference: "reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json",
  payloadHash: payload.payloadHash,
  verificationReference: "public-docs/dex-liquidity-funding-transfer-safe-payload-verification-status.json",
  submissionApprovalReference: "public-docs/dex-liquidity-funding-transfer-safe-submission-approval-status.json",
  transactionCount: preparedTransactions.length,
  preparedTransactions,
  operatorWarnings: [
    "Use the source Safe, not the destination Safe, for submission.",
    "Do not change token addresses, recipients, amounts, value, data, or operation.",
    "Do not execute during the submission step.",
    "Do not submit any unrelated Safe transaction.",
    "Do not add liquidity or activate public trading."
  ],
  requiredBeforeFundingTransferSafeSubmissionDryRun: {
    safeSubmissionPreparationComplete: true,
    safeSubmissionApprovalRecorded: true,
    fundingTransferSafePayloadVerified: true,
    payloadHashVerified: true,
    sourceSafeReviewed: true,
    destinationSafeReviewed: true,
    tokenTransferAmountsReviewed: true,
    operatorSubmissionCommandReviewed: false,
    safeSubmissionDryRunComplete: false,
    publicStatusUpdatePrepared: false
  },
  flags: {
    safeSubmissionPreparationComplete: true,
    safeSubmissionDryRunComplete: false,
    fundingTransferSubmitted: false,
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
    fullLaunchApproved: false
  },
  safety: {
    preparationOnly: true,
    submitsSafeTransaction: false,
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

record.preparationHash = sha256Json(record);

writeJson(recordFile, record);

const config = readJsonPath(configFile);

config.status = "funding-transfer-safe-submission-prepared-not-submitted-no-funds-moved";
config.safeSubmissionPreparationComplete = true;
config.safeSubmissionDryRunComplete = false;
config.fundingTransferSubmitted = false;
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
config.preparedFundingTransferSafeSubmission = {
  preparedAt,
  sourceSafeAddress,
  destinationSafeAddress,
  payloadHash: payload.payloadHash,
  transactionCount: preparedTransactions.length,
  recordFile: "reports/dex-liquidity-funding-transfer-safe-submission-preparation/dex-liquidity-funding-transfer-safe-submission-preparation.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-funding-transfer-safe-submission-preparation-result-v0.1",
  checkedAt: preparedAt,
  status: record.status,
  sourceSafeAddress,
  destinationSafeAddress,
  payloadHash: payload.payloadHash,
  transactionCount: preparedTransactions.length,
  safeSubmissionPreparationComplete: true,
  fundingTransferSubmitted: false,
  fundingTransferExecuted: false,
  treasuryFundsMoved: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
