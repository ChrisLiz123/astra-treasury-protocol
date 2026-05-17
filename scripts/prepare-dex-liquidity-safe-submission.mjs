import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const reportDir = path.join(root, "reports", "dex-liquidity-safe-submission-preparation");
const preparationFile = path.join(reportDir, "dex-liquidity-safe-submission-preparation.json");
const configFile = path.join(root, "configs", "dex-liquidity-safe-submission-preparation.config.json");

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

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

fs.mkdirSync(reportDir, { recursive: true });

const submissionApprovalStatus = readJson("public-docs/dex-liquidity-safe-submission-approval-status.json");
const submissionApprovalRecord = readJson("reports/dex-liquidity-safe-submission-approval/dex-liquidity-safe-submission-approval-record.json");
const payloadVerificationStatus = readJson("public-docs/dex-liquidity-safe-payload-verification-status.json");
const payloadVerification = readJson("reports/dex-liquidity-safe-payload-verification/dex-liquidity-safe-payload-verification.json");
const payloadStatus = readJson("public-docs/dex-liquidity-safe-payload-status.json");
const safePayload = readJson("reports/dex-liquidity-provision/payload/liquidity-safe-payload.json");
const transactionBuilder = readJson("reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json");
const calldataVerificationStatus = readJson("public-docs/dex-liquidity-mint-calldata-verification-status.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireStatus("submissionApprovalStatus.status", submissionApprovalStatus.status, "DEX_LIQUIDITY_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("submissionApprovalRecord.status", submissionApprovalRecord.status, "DEX_LIQUIDITY_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("payloadVerificationStatus.status", payloadVerificationStatus.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("payloadVerification.status", payloadVerification.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("payloadStatus.status", payloadStatus.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("safePayload.status", safePayload.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("calldataVerificationStatus.status", calldataVerificationStatus.status, "DEX_LIQUIDITY_MINT_CALLDATA_VERIFIED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("poolStatus.status", poolStatus.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

if (submissionApprovalStatus.summary?.liquiditySafeSubmissionApproved !== true) {
  issue("submissionApprovalStatus.summary.liquiditySafeSubmissionApproved", "Liquidity Safe submission approval must be recorded.");
}

if (submissionApprovalStatus.summary?.liquiditySafeTransactionSubmitted !== false || submissionApprovalStatus.summary?.liquiditySafeTransactionExecuted !== false || submissionApprovalStatus.summary?.liquidityAdded !== false) {
  issue("submissionApprovalStatus.summary.flags", "Submission approval must show not submitted, not executed, and no liquidity.");
}

if (payloadVerificationStatus.summary?.liquiditySafePayloadVerified !== true) {
  issue("payloadVerificationStatus.summary.liquiditySafePayloadVerified", "Safe payload must be verified.");
}

if (
  payloadVerificationStatus.summary?.safePayloadHashVerified !== true ||
  payloadVerificationStatus.summary?.transactionBuilderHashVerified !== true ||
  payloadVerificationStatus.summary?.transactionDataVerified !== true
) {
  issue("payloadVerificationStatus.summary.hashDataFlags", "Safe payload hash, Transaction Builder hash, and transaction data must verify.");
}

if (payloadVerification.liveChecks?.token0?.balanceCoversDesired !== true || payloadVerification.liveChecks?.token0?.allowanceCoversDesired !== true) {
  issue("payloadVerification.liveChecks.token0", "Token0 live balance and allowance must cover desired amount.");
}

if (payloadVerification.liveChecks?.token1?.balanceCoversDesired !== true || payloadVerification.liveChecks?.token1?.allowanceCoversDesired !== true) {
  issue("payloadVerification.liveChecks.token1", "Token1 live balance and allowance must cover desired amount.");
}

if (!isAddress(safePayload.safeAddress) || !isAddress(safePayload.liquiditySafeAddress)) {
  issue("safePayload.safeAddress", "Safe payload Safe address must be valid.");
}

if (!sameAddress(safePayload.safeAddress, safePayload.liquiditySafeAddress)) {
  issue("safePayload.safeAddress", "safeAddress must equal liquiditySafeAddress.");
}

if (!sameAddress(safePayload.liquiditySafeAddress, payloadVerification.liquiditySafeAddress)) {
  issue("safePayload.liquiditySafeAddress", "Safe payload liquidity Safe must match verification record.");
}

if (!isAddress(safePayload.nonfungiblePositionManager)) {
  issue("safePayload.nonfungiblePositionManager", "NonfungiblePositionManager must be valid.");
}

if (!sameAddress(safePayload.nonfungiblePositionManager, payloadVerification.nonfungiblePositionManager)) {
  issue("safePayload.nonfungiblePositionManager", "Safe payload target must match verification record.");
}

if (safePayload.safePayloadHash !== payloadVerification.safePayloadHash) {
  issue("safePayload.safePayloadHash", "Safe payload hash must match verification record.");
}

if (safePayload.transactionBuilderHash !== transactionBuilder.transactionBuilderHash) {
  issue("safePayload.transactionBuilderHash", "Safe payload Transaction Builder hash must match builder file.");
}

if (safePayload.calldataHash !== payloadVerification.calldataHash) {
  issue("safePayload.calldataHash", "Safe payload calldata hash must match verification record.");
}

if (!Array.isArray(safePayload.transactions) || safePayload.transactions.length !== 1) {
  issue("safePayload.transactions", "Safe payload must contain exactly one transaction.");
}

const tx = safePayload.transactions?.[0] || {};
const builderTx = transactionBuilder.transactions?.[0] || {};

if (!isAddress(tx.to) || !sameAddress(tx.to, safePayload.nonfungiblePositionManager)) {
  issue("safePayload.transactions.0.to", "Transaction target must be the NonfungiblePositionManager.");
}

if (String(tx.value) !== "0" || tx.operation !== "CALL" || tx.operationValue !== 0) {
  issue("safePayload.transactions.0.call", "Transaction must be CALL with value 0.");
}

if (!String(tx.data || "").startsWith("0x88316456")) {
  issue("safePayload.transactions.0.data", "Transaction data must be Uniswap V3 mint calldata.");
}

if (!sameAddress(builderTx.to, tx.to) || String(builderTx.value) !== String(tx.value) || String(builderTx.data) !== String(tx.data)) {
  issue("transactionBuilder.transactions.0", "Transaction Builder transaction must match Safe payload transaction.");
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
  "reports/dex-liquidity-safe-submission-live/dex-liquidity-safe-submission-live-record.json",
  "reports/dex-liquidity-safe-pending-signatures/dex-liquidity-safe-pending-signatures-monitoring.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/dex-liquidity-safe-submission-live-status.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden submission/live/liquidity/public-trading artifact exists. Submission preparation must not submit or add liquidity.");
  }
}

if (issues.length > 0) {
  const failed = {
    schema: "astra-dex-liquidity-safe-submission-preparation-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_SAFE_SUBMISSION_NOT_PREPARED",
    issues
  };

  writeJson(preparationFile, failed);
  console.log(JSON.stringify(failed, null, 2));
  process.exit(1);
}

const preparedAt = new Date().toISOString();
const safeQueueUrl = `https://app.safe.global/transactions/queue?safe=base:${safePayload.liquiditySafeAddress}`;
const safeHomeUrl = `https://app.safe.global/home?safe=base:${safePayload.liquiditySafeAddress}`;

const preparation = {
  schema: "astra-dex-liquidity-safe-submission-preparation-v0.1",
  preparedAt,
  status: "DEX_LIQUIDITY_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  liquiditySafeAddress: safePayload.liquiditySafeAddress,
  safeAddress: safePayload.safeAddress,
  safeQueueUrl,
  safeHomeUrl,
  network: "Base Mainnet",
  chainId: 8453,
  nonfungiblePositionManager: safePayload.nonfungiblePositionManager,
  poolAddress: safePayload.poolAddress,
  safePayloadReference: "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  transactionBuilderReference: "reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json",
  safePayloadVerificationReference: "public-docs/dex-liquidity-safe-payload-verification-status.json",
  safePayloadHash: safePayload.safePayloadHash,
  transactionBuilderHash: safePayload.transactionBuilderHash,
  calldataHash: safePayload.calldataHash,
  transactionCount: safePayload.transactionCount,
  transactionBuilderImportInstruction: "Open the liquidity Safe on Base, use Transaction Builder, import reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json, review the single mint transaction, then use the later submission-live milestone to record proposal evidence. Do not execute during submission.",
  safeUiInstruction: "Use the liquidity Safe on Base. Import the verified Transaction Builder JSON. Submit/propose only this verified transaction. Do not execute it during submission.",
  preparedTransactions: safePayload.transactions.map((item, index) => ({
    index,
    id: item.id || `tx-${index}`,
    description: item.description || "",
    to: item.to,
    value: item.value,
    operation: item.operation,
    operationValue: item.operationValue,
    dataHash: item.dataHash,
    functionSelector: item.functionSelector,
    functionSignature: item.functionSignature,
    dataPreview: `${String(item.data || "").slice(0, 42)}...${String(item.data || "").slice(-16)}`,
    transactionBuilderFields: {
      to: item.to,
      value: item.value,
      data: item.data,
      operation: item.operation
    },
    checks: {
      targetIsNonfungiblePositionManager: sameAddress(item.to, safePayload.nonfungiblePositionManager),
      valueIsZero: String(item.value) === "0",
      operationIsCall: item.operation === "CALL",
      dataStartsWithMintSelector: String(item.data || "").startsWith("0x88316456")
    }
  })),
  operatorWarnings: [
    "Use only the liquidity Safe on Base.",
    "Import only the verified Transaction Builder JSON referenced in this preparation record.",
    "The transaction target must be the NonfungiblePositionManager.",
    "The transaction value must be 0.",
    "The transaction data must start with 0x88316456.",
    "Submit/propose only. Do not execute during the submission milestone.",
    "Do not submit unrelated Safe transactions.",
    "Do not add liquidity outside the approved Safe workflow.",
    "Do not approve public trading or full launch."
  ],
  liquiditySafeSubmissionPreparationComplete: true,
  operatorSubmissionCommandReviewed: true,
  liquiditySafeSubmissionApprovalRecorded: true,
  liquiditySafeSubmissionApproved: true,
  liquiditySafePayloadGenerated: true,
  liquiditySafePayloadVerified: true,
  safePayloadHashVerified: true,
  transactionBuilderHashVerified: true,
  transactionDataVerified: true,
  liveBalancesVerified: true,
  liveAllowancesVerified: true,
  poolLiquidityStillZero: true,
  liquiditySafeTransactionSubmitted: false,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  publicTradingLinkApproved: false,
  buyPageActivated: false,
  fullLaunchApproved: false,
  requiredBeforeLiquiditySafeSubmissionDryRun: {
    liquiditySafeSubmissionPreparationComplete: true,
    operatorSubmissionCommandReviewed: true,
    liquiditySafeSubmissionApprovalRecorded: true,
    liquiditySafePayloadGenerated: true,
    liquiditySafePayloadVerified: true,
    safePayloadHashRecorded: true,
    transactionBuilderHashRecorded: true,
    liquiditySafeTransactionSubmitted: false,
    liquiditySafeTransactionExecuted: false,
    liquidityAdded: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    preparationOnly: true,
    submitsLiquiditySafeTransaction: false,
    executesLiquiditySafeTransaction: false,
    addsLiquidity: false,
    mintsPositionOnchain: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

preparation.preparationHash = sha256Json(preparation);

writeJson(preparationFile, preparation);

const config = readJsonPath(configFile);

config.status = "liquidity-safe-submission-prepared-not-submitted-not-executed-no-liquidity-no-public-trading";
config.liquiditySafeSubmissionPreparationComplete = true;
config.operatorSubmissionCommandReviewed = true;
config.liquiditySafeSubmissionApprovalRecorded = true;
config.liquiditySafeSubmissionApproved = true;
config.liquiditySafePayloadGenerated = true;
config.liquiditySafePayloadVerified = true;
config.liquiditySafeTransactionSubmitted = false;
config.liquiditySafeTransactionExecuted = false;
config.liquidityAdded = false;
config.positionMinted = false;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.buyPageActivationApproved = false;
config.fullLaunchApproved = false;
config.preparedLiquiditySafeSubmission = {
  preparedAt,
  liquiditySafeAddress: preparation.liquiditySafeAddress,
  safeQueueUrl,
  safePayloadHash: preparation.safePayloadHash,
  transactionBuilderHash: preparation.transactionBuilderHash,
  calldataHash: preparation.calldataHash,
  recordFile: "reports/dex-liquidity-safe-submission-preparation/dex-liquidity-safe-submission-preparation.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-safe-submission-preparation-result-v0.1",
  checkedAt: preparedAt,
  status: preparation.status,
  liquiditySafeAddress: preparation.liquiditySafeAddress,
  safeQueueUrl: preparation.safeQueueUrl,
  safePayloadHash: preparation.safePayloadHash,
  transactionBuilderHash: preparation.transactionBuilderHash,
  transactionCount: preparation.transactionCount,
  liquiditySafeSubmissionPreparationComplete: true,
  liquiditySafeTransactionSubmitted: false,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
