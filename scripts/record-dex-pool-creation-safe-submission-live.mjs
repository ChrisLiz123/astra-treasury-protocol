import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const confirm = process.env.DEX_SAFE_SUBMISSION_LIVE_CONFIRM || "";
const requiredConfirm = "RECORD_DEX_SAFE_SUBMISSION_LIVE_ONLY_NOT_EXECUTION";

const safeTxHash = process.env.DEX_SAFE_TX_HASH || "";
const safeNonce = process.env.DEX_SAFE_NONCE || "";
const safeTransactionUrl = process.env.DEX_SAFE_TRANSACTION_URL || "";
const submissionMethod = process.env.DEX_SAFE_SUBMISSION_METHOD || "";
const submittedBy = process.env.DEX_SAFE_SUBMITTED_BY || "";
const submittedAt = process.env.DEX_SAFE_SUBMITTED_AT || "";
const submissionReference = process.env.DEX_SAFE_SUBMISSION_REFERENCE || "";
const overwrite = process.env.OVERWRITE_DEX_SAFE_SUBMISSION_LIVE || "";

const recordDir = path.join(root, "reports", "dex-pool-creation-safe-submission-live");
const recordFile = path.join(recordDir, "dex-pool-creation-safe-submission-live-record.json");
const configFile = path.join(root, "configs", "dex-pool-creation-safe-submission-live.config.json");

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

function isNonEmpty(value) {
  return String(value || "").trim().length > 0;
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
  issue("DEX_SAFE_SUBMISSION_LIVE_CONFIRM", `Must equal ${requiredConfirm}.`);
}

if (!isTxHash(safeTxHash)) {
  issue("DEX_SAFE_TX_HASH", "Safe transaction hash must be a 0x-prefixed 32-byte hash.");
}

if (!/^\d+$/.test(String(safeNonce || "").trim())) {
  issue("DEX_SAFE_NONCE", "Safe nonce must be a non-negative integer.");
}

requireUsable("DEX_SAFE_TRANSACTION_URL", safeTransactionUrl);
requireUsable("DEX_SAFE_SUBMISSION_METHOD", submissionMethod);
requireUsable("DEX_SAFE_SUBMITTED_BY", submittedBy);
requireUsable("DEX_SAFE_SUBMITTED_AT", submittedAt);
requireUsable("DEX_SAFE_SUBMISSION_REFERENCE", submissionReference);

if (fs.existsSync(recordFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_DEX_SAFE_SUBMISSION_LIVE",
    "Live submission record already exists. Set OVERWRITE_DEX_SAFE_SUBMISSION_LIVE=YES only if replacing intentionally."
  );
}

const executionApproval = readJson("public-docs/dex-pool-creation-safe-submission-execution-approval-status.json");
const dryRun = readJson("public-docs/dex-pool-creation-safe-submission-dry-run-status.json");
const preparation = readJson("public-docs/dex-pool-creation-safe-submission-preparation-status.json");
const submissionApproval = readJson("public-docs/dex-pool-creation-safe-submission-approval-status.json");
const verification = readJson("public-docs/dex-pool-creation-safe-payload-verification-status.json");
const generation = readJson("public-docs/dex-pool-creation-safe-payload-generation-status.json");
const precheck = readJson("public-docs/dex-pool-existence-precheck-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const safeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");
const payload = readJson("reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json");

if (executionApproval.status !== "DEX_POOL_CREATION_SAFE_SUBMISSION_EXECUTION_APPROVED_NOT_SUBMITTED") {
  issue("executionApproval.status", "Safe submission execution approval must be recorded.");
}

if (dryRun.status !== "DEX_POOL_CREATION_SAFE_SUBMISSION_DRY_RUN_REVIEW_READY_NOT_SUBMITTED") {
  issue("dryRun.status", "Safe submission dry run review must be complete.");
}

if (preparation.status !== "DEX_POOL_CREATION_SAFE_SUBMISSION_PREPARATION_READY_NOT_SUBMITTED") {
  issue("preparation.status", "Safe submission preparation must be ready.");
}

if (submissionApproval.status !== "DEX_POOL_CREATION_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED") {
  issue("submissionApproval.status", "Safe submission approval must be recorded.");
}

if (verification.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_VERIFICATION_REVIEW_COMPLETE_NOT_EXECUTED") {
  issue("verification.status", "Safe payload verification must be complete.");
}

if (generation.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATED_NOT_EXECUTED") {
  issue("generation.status", "Safe payload must be generated and not executed.");
}

if (precheck.status !== "DEX_POOL_EXISTENCE_FACTORY_PRECHECK_COMPLETE_NO_POOL_FOUND" || precheck.summary?.poolExists !== false) {
  issue("precheck.status", "Fresh no-pool recheck must show no selected pool.");
}

if (payload.flags?.safeTransactionExecuted !== false || payload.flags?.poolCreated !== false || payload.flags?.liquidityAdded !== false || payload.flags?.fundsMoved !== false) {
  issue("payload.flags", "Payload must still show not executed, no pool, no liquidity, and no funds movement.");
}

if (fullLaunch.fullLaunchApproved !== false) {
  issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
}

if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
  issue("treasuryFunding", "Treasury funding must remain not approved and not executed.");
}

if (safeTx.safeTransactionPayloadGenerated !== false || safeTx.safeTransactionPrepared !== false) {
  issue("safeTx", "General treasury Safe transaction status must remain not prepared/submitted.");
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
  "reports/dex-pool-creation-safe-execution/executed/safe-execution-record.json",
  "reports/dex-pool-creation/live/dex-pool-created.json",
  "reports/dex-pool-creation/live/pool-created.json",
  "reports/dex-pool-creation/direct/direct-execution-submitted.json",
  "public-docs/dex-pool-created-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden execution/live artifact exists. Submission live evidence must not execute or create a pool.");
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-pool-creation-safe-submission-live-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_SAFE_SUBMISSION_LIVE_NOT_RECORDED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const now = new Date().toISOString();

const record = {
  schema: "astra-dex-pool-creation-safe-submission-live-record-v0.1",
  recordedAt: now,
  status: "DEX_POOL_CREATION_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  submissionMethod,
  submittedBy,
  submittedAt,
  submissionReference,
  safeTransactionUrl,
  safeTxHash,
  safeNonce: Number(safeNonce),
  payloadHash: payload.payloadHash || "",
  safeAddress: payload.safeAddress || "",
  targetAddress: payload.transaction?.to || "",
  functionSignature: payload.transaction?.functionSignature || "",
  value: payload.transaction?.value || "0",
  operation: payload.transaction?.operation || "CALL",
  safeSubmissionLiveRecorded: true,
  safeTransactionSubmitted: true,
  safeTransactionQueued: true,
  safeTransactionPendingSignatures: true,
  safeTransactionExecutionApproved: false,
  safeTransactionExecuted: false,
  poolCreationExecutionApproved: false,
  poolCreated: false,
  liquidityProvisionApproved: false,
  liquidityAdded: false,
  publicTradingApproved: false,
  publicTradingLinkApproved: false,
  buyPageActivated: false,
  treasuryFundingApproved: false,
  treasuryFundsMoved: false,
  fullLaunchApproved: false,
  requiredBeforeSafeExecution: {
    safeSubmissionLiveRecorded: true,
    safeTransactionHashRecorded: true,
    safeTransactionPendingOrQueued: true,
    signaturesOrConfirmationsReviewed: false,
    freshNoPoolRecheckBeforeExecution: false,
    safeExecutionApprovalRecorded: false,
    publicStatusUpdatePrepared: false,
    postExecutionMonitoringPlanReady: false
  },
  safety: {
    executesSafeTransaction: false,
    createsLiquidityPoolByThisRecord: false,
    addsLiquidity: false,
    movesFunds: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

writeJson(recordFile, record);

const config = readJsonPath(configFile);

config.status = "safe-submission-live-recorded-not-executed";
config.safeSubmissionLiveRecorded = true;
config.safeTransactionSubmitted = true;
config.safeTransactionQueued = true;
config.safeTransactionPendingSignatures = true;
config.safeTransactionExecutionApproved = false;
config.safeTransactionExecuted = false;
config.poolCreationExecutionApproved = false;
config.poolCreated = false;
config.liquidityProvisionApproved = false;
config.liquidityAdded = false;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.buyPageActivationApproved = false;
config.treasuryFundingApproved = false;
config.treasuryFundsMoved = false;
config.fullLaunchApproved = false;
config.liveSubmission = {
  recordedAt: now,
  safeTxHash,
  safeNonce: Number(safeNonce),
  safeTransactionUrl,
  payloadHash: payload.payloadHash || "",
  recordFile: "reports/dex-pool-creation-safe-submission-live/dex-pool-creation-safe-submission-live-record.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-pool-creation-safe-submission-live-result-v0.1",
  checkedAt: now,
  status: "DEX_POOL_CREATION_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED",
  recordFile,
  safeTxHash,
  safeNonce: Number(safeNonce),
  safeTransactionUrl,
  safeTransactionSubmitted: true,
  safeTransactionQueued: true,
  safeTransactionExecuted: false,
  poolCreated: false,
  liquidityAdded: false,
  movesFunds: false,
  approvesPublicTrading: false,
  approvesFullLaunch: false
}, null, 2));
