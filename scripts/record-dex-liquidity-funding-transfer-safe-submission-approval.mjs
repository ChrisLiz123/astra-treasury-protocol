import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const confirm = process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_APPROVAL_CONFIRM || "";
const approver = process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_APPROVER || "";
const approvalReference = process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_APPROVAL_REFERENCE || "";
const overwrite = process.env.OVERWRITE_DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_APPROVAL || "";

const requiredConfirm = "APPROVE_DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_ONLY_NOT_EXECUTION";

const recordDir = path.join(root, "reports", "dex-liquidity-funding-transfer-safe-submission-approval");
const recordFile = path.join(recordDir, "dex-liquidity-funding-transfer-safe-submission-approval-record.json");
const configFile = path.join(root, "configs", "dex-liquidity-funding-transfer-safe-submission-approval.config.json");

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

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function isZeroAddress(value) {
  return String(value || "").toLowerCase() === "0x0000000000000000000000000000000000000000";
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

if (confirm !== requiredConfirm) {
  issue("DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_APPROVAL_CONFIRM", `Must equal ${requiredConfirm}.`);
}

requireUsable("DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_APPROVER", approver);
requireUsable("DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_APPROVAL_REFERENCE", approvalReference);

if (fs.existsSync(recordFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_APPROVAL",
    "Approval record already exists. Set OVERWRITE_DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_APPROVAL=YES only if replacing intentionally."
  );
}

const payloadVerificationStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-payload-verification-status.json");
const payloadVerification = readJson("reports/dex-liquidity-funding-transfer-safe-payload-verification/dex-liquidity-funding-transfer-safe-payload-verification.json");
const payloadStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-payload-status.json");
const payload = readJson("reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json");
const payloadApproval = readJson("public-docs/dex-liquidity-funding-transfer-payload-generation-approval-status.json");
const transferApproval = readJson("public-docs/dex-liquidity-funding-transfer-approval-status.json");
const requirementsStatus = readJson("public-docs/dex-liquidity-funding-transfer-requirements-status.json");
const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

if (payloadVerificationStatus.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_FUNDS_MOVED") {
  issue("payloadVerificationStatus.status", "Funding-transfer Safe payload verification must be complete.");
}

if (payloadVerificationStatus.summary?.fundingTransferSafePayloadVerified !== true || payloadVerificationStatus.summary?.payloadHashVerified !== true) {
  issue("payloadVerificationStatus.summary", "Payload must be verified and payload hash must verify.");
}

if (payloadVerificationStatus.summary?.fundingTransferSubmitted !== false || payloadVerificationStatus.summary?.fundingTransferExecuted !== false || payloadVerificationStatus.summary?.treasuryFundsMoved !== false) {
  issue("payloadVerificationStatus.summary", "Verification status must show not submitted, not executed, and no treasury funds moved.");
}

if (payloadStatus.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_FUNDS_MOVED") {
  issue("payloadStatus.status", "Funding-transfer Safe payload must be generated.");
}

if (payloadApproval.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_NO_FUNDS_MOVED") {
  issue("payloadApproval.status", "Funding-transfer payload generation approval must be recorded.");
}

if (transferApproval.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_APPROVED_NO_PAYLOAD_NO_FUNDS_MOVED") {
  issue("transferApproval.status", "Funding-transfer plan approval must be recorded.");
}

if (requirementsStatus.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_REQUIREMENTS_REVIEW_COMPLETE_NO_FUNDS_MOVED") {
  issue("requirementsStatus.status", "Funding-transfer requirements review must be complete.");
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
    issue(file, "Forbidden live/submission/liquidity/public-trading artifact exists. Approval must not submit, move funds, or add liquidity.");
  }
}

if (!isAddress(payload.sourceSafeAddress) || isZeroAddress(payload.sourceSafeAddress)) {
  issue("payload.sourceSafeAddress", "Source Safe address must be valid.");
}

if (!isAddress(payload.destinationSafeAddress) || isZeroAddress(payload.destinationSafeAddress)) {
  issue("payload.destinationSafeAddress", "Destination Safe address must be valid.");
}

if (!payload.payloadHash || payload.payloadHash !== payloadVerificationStatus.summary?.payloadHash) {
  issue("payload.payloadHash", "Payload hash must match verified public status.");
}

if (!Array.isArray(payload.transactions) || payload.transactions.length <= 0) {
  issue("payload.transactions", "Payload transactions must be present.");
}

if (!Array.isArray(payloadVerification.transactionChecks) || payloadVerification.transactionChecks.length <= 0) {
  issue("payloadVerification.transactionChecks", "Verification transaction checks must be present.");
}

for (const check of payloadVerification.transactionChecks || []) {
  if (check.calldataVerified !== true || check.amountMatchesShortfall !== true || check.sourceBalanceCoversTransfer !== true || check.destinationBalanceUnchanged !== true) {
    issue(`payloadVerification.transactionChecks.${check.id}`, "All verification transaction checks must pass.");
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-funding-transfer-safe-submission-approval-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_NOT_APPROVED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const now = new Date().toISOString();

const record = {
  schema: "astra-dex-liquidity-funding-transfer-safe-submission-approval-record-v0.1",
  recordedAt: now,
  status: "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NO_FUNDS_MOVED",
  approvalScope: "safe-submission-only-not-execution-no-funds-moved",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  approver,
  approvalReference,
  fundingTransferSafePayloadVerificationReference: "public-docs/dex-liquidity-funding-transfer-safe-payload-verification-status.json",
  fundingTransferSafePayloadReference: "public-docs/dex-liquidity-funding-transfer-safe-payload-status.json",
  payloadReference: "reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json",
  payloadHash: payload.payloadHash,
  sourceSafeAddress: payload.sourceSafeAddress,
  destinationSafeAddress: payload.destinationSafeAddress,
  transactionCount: payload.transactionCount,
  fundingTransferSafeSubmissionApprovalRecorded: true,
  fundingTransferSafeSubmissionApproved: true,
  fundingTransferSafePayloadVerified: true,
  fundingTransferPayloadGenerated: true,
  fundingTransferSafePayloadGenerated: true,
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
  fullLaunchApproved: false,
  requiredBeforeFundingTransferSafeSubmissionLive: {
    fundingTransferSafeSubmissionApprovalRecorded: true,
    fundingTransferSafePayloadVerified: true,
    sourceSafeReviewed: true,
    destinationSafeReviewed: true,
    tokenTransferAmountsReviewed: true,
    operatorSubmissionCommandReviewed: false,
    safeSubmissionPreparationComplete: false,
    safeSubmissionDryRunComplete: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
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

writeJson(recordFile, record);

const config = readJsonPath(configFile);

config.status = "funding-transfer-safe-submission-approved-not-submitted-no-funds-moved";
config.fundingTransferSafeSubmissionApprovalRecorded = true;
config.fundingTransferSafeSubmissionApproved = true;
config.fundingTransferSafePayloadVerified = true;
config.fundingTransferPayloadGenerated = true;
config.fundingTransferSafePayloadGenerated = true;
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
config.approvedFundingTransferSafeSubmission = {
  recordedAt: now,
  approver,
  approvalReference,
  sourceSafeAddress: record.sourceSafeAddress,
  destinationSafeAddress: record.destinationSafeAddress,
  payloadHash: record.payloadHash,
  recordFile: "reports/dex-liquidity-funding-transfer-safe-submission-approval/dex-liquidity-funding-transfer-safe-submission-approval-record.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-funding-transfer-safe-submission-approval-result-v0.1",
  checkedAt: now,
  status: "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NO_FUNDS_MOVED",
  recordFile,
  sourceSafeAddress: record.sourceSafeAddress,
  destinationSafeAddress: record.destinationSafeAddress,
  payloadHash: record.payloadHash,
  fundingTransferSafeSubmissionApproved: true,
  fundingTransferSubmitted: false,
  fundingTransferExecuted: false,
  treasuryFundsMoved: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
