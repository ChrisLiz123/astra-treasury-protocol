import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const confirm = process.env.DEX_SAFE_EXECUTION_APPROVAL_CONFIRM || "";
const approver = process.env.DEX_SAFE_EXECUTION_APPROVER || "";
const approvalReference = process.env.DEX_SAFE_EXECUTION_APPROVAL_REFERENCE || "";
const overwrite = process.env.OVERWRITE_DEX_SAFE_EXECUTION_APPROVAL || "";

const requiredConfirm = "APPROVE_DEX_SAFE_EXECUTION_ONLY_NOT_EXECUTE";

const recordDir = path.join(root, "reports", "dex-pool-creation-safe-execution-approval");
const recordFile = path.join(recordDir, "dex-pool-creation-safe-execution-approval-record.json");
const configFile = path.join(root, "configs", "dex-pool-creation-safe-execution-approval.config.json");

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
  issue("DEX_SAFE_EXECUTION_APPROVAL_CONFIRM", `Must equal ${requiredConfirm}.`);
}

requireUsable("DEX_SAFE_EXECUTION_APPROVER", approver);
requireUsable("DEX_SAFE_EXECUTION_APPROVAL_REFERENCE", approvalReference);

if (fs.existsSync(recordFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_DEX_SAFE_EXECUTION_APPROVAL",
    "Approval record already exists. Set OVERWRITE_DEX_SAFE_EXECUTION_APPROVAL=YES only if replacing intentionally."
  );
}

const pending = readJson("public-docs/dex-pool-creation-safe-pending-signatures-status.json");
const live = readJson("public-docs/dex-pool-creation-safe-submission-live-status.json");
const submissionExecutionApproval = readJson("public-docs/dex-pool-creation-safe-submission-execution-approval-status.json");
const verification = readJson("public-docs/dex-pool-creation-safe-payload-verification-status.json");
const precheck = readJson("public-docs/dex-pool-existence-precheck-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const safeTxGeneral = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

if (pending.status !== "DEX_POOL_CREATION_SAFE_PENDING_SIGNATURE_MONITORING_THRESHOLD_REACHED_NOT_EXECUTED") {
  issue("pending.status", "Pending signature monitoring must show threshold reached and not executed.");
}

if (pending.summary?.thresholdReached !== true) {
  issue("pending.summary.thresholdReached", "Threshold must be reached before Safe execution approval.");
}

if (pending.summary?.safeTransactionExecuted !== false || pending.summary?.poolCreated !== false || pending.summary?.liquidityAdded !== false || pending.summary?.fundsMoved !== false) {
  issue("pending.summary", "Pending monitor must show not executed, no pool, no liquidity, and no funds movement.");
}

if (live.status !== "DEX_POOL_CREATION_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED") {
  issue("live.status", "Safe submission live evidence must be recorded.");
}

if (submissionExecutionApproval.status !== "DEX_POOL_CREATION_SAFE_SUBMISSION_EXECUTION_APPROVED_NOT_SUBMITTED") {
  issue("submissionExecutionApproval.status", "Safe submission action approval must be recorded.");
}

if (verification.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_VERIFICATION_REVIEW_COMPLETE_NOT_EXECUTED") {
  issue("verification.status", "Safe payload verification must be complete.");
}

if (precheck.status !== "DEX_POOL_EXISTENCE_FACTORY_PRECHECK_COMPLETE_NO_POOL_FOUND" || precheck.summary?.poolExists !== false) {
  issue("precheck.status", "Fresh no-pool recheck must show no selected pool before execution approval.");
}

if (fullLaunch.fullLaunchApproved !== false) {
  issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
}

if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
  issue("treasuryFunding", "Treasury funding must remain not approved and not executed.");
}

if (safeTxGeneral.safeTransactionPayloadGenerated !== false || safeTxGeneral.safeTransactionPrepared !== false) {
  issue("safeTxGeneral", "General treasury Safe transaction status must remain not prepared/submitted.");
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
    issue(file, "Forbidden execution/live artifact exists. Approval must not execute or create a pool.");
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-pool-creation-safe-execution-approval-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_SAFE_EXECUTION_NOT_APPROVED",
    issues
  }, null, 2));
  process.exit(1);
}

const pendingReport = readJson("reports/dex-pool-creation-safe-pending-signatures/dex-pool-creation-safe-pending-signature-monitoring.json");
const liveRecord = readJson("reports/dex-pool-creation-safe-submission-live/dex-pool-creation-safe-submission-live-record.json");

fs.mkdirSync(recordDir, { recursive: true });

const now = new Date().toISOString();

const record = {
  schema: "astra-dex-pool-creation-safe-execution-approval-record-v0.1",
  recordedAt: now,
  status: "DEX_POOL_CREATION_SAFE_EXECUTION_APPROVED_NOT_EXECUTED",
  approvalScope: "safe-execution-and-pool-creation-execution-only-no-liquidity-no-public-trading",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  approver,
  approvalReference,
  pendingSignatureMonitoringReference: "public-docs/dex-pool-creation-safe-pending-signatures-status.json",
  safeSubmissionLiveReference: "public-docs/dex-pool-creation-safe-submission-live-status.json",
  freshNoPoolRecheckReference: "public-docs/dex-pool-existence-precheck-status.json",
  safeTxHash: pending.summary?.safeTxHash || liveRecord.safeTxHash || "",
  safeNonce: liveRecord.safeNonce,
  safeAddress: liveRecord.safeAddress,
  safeTransactionUrl: liveRecord.safeTransactionUrl,
  confirmationCount: pending.summary?.confirmationCount,
  requiredThreshold: pending.summary?.requiredThreshold,
  thresholdReached: true,
  payloadHash: liveRecord.payloadHash,
  safeExecutionApprovalRecorded: true,
  safeTransactionExecutionApproved: true,
  poolCreationExecutionApproved: true,
  safeTransactionExecuted: false,
  poolCreated: false,
  liquidityProvisionApproved: false,
  liquidityAdded: false,
  publicTradingApproved: false,
  publicTradingLinkApproved: false,
  buyPageActivated: false,
  treasuryFundingApproved: false,
  treasuryFundsMoved: false,
  fullLaunchApproved: false,
  requiredBeforeActualSafeExecution: {
    pendingSignatureThresholdReached: true,
    freshNoPoolRecheckBeforeExecution: true,
    safeExecutionApprovalRecorded: true,
    publicStatusUpdatePrepared: false,
    postExecutionMonitoringPlanReady: false,
    operatorSafeExecutionCommandReviewed: false
  },
  safety: {
    executesSafeTransactionByThisRecord: false,
    createsLiquidityPoolByThisRecord: false,
    addsLiquidity: false,
    movesFunds: false,
    activatesBuyPage: false,
    approvesLiquidityProvision: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

writeJson(recordFile, record);

const config = readJsonPath(configFile);

config.status = "safe-execution-approved-not-executed";
config.safeExecutionApprovalRecorded = true;
config.safeTransactionExecutionApproved = true;
config.poolCreationExecutionApproved = true;
config.safeTransactionExecuted = false;
config.poolCreated = false;
config.liquidityProvisionApproved = false;
config.liquidityAdded = false;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.buyPageActivationApproved = false;
config.treasuryFundingApproved = false;
config.treasuryFundsMoved = false;
config.fullLaunchApproved = false;
config.approvedSafeExecution = {
  recordedAt: now,
  approver,
  approvalReference,
  recordFile: "reports/dex-pool-creation-safe-execution-approval/dex-pool-creation-safe-execution-approval-record.json",
  safeTxHash: record.safeTxHash,
  safeAddress: record.safeAddress,
  payloadHash: record.payloadHash
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-pool-creation-safe-execution-approval-result-v0.1",
  checkedAt: now,
  status: "DEX_POOL_CREATION_SAFE_EXECUTION_APPROVED_NOT_EXECUTED",
  recordFile,
  safeTxHash: record.safeTxHash,
  safeAddress: record.safeAddress,
  thresholdReached: true,
  safeTransactionExecutionApproved: true,
  poolCreationExecutionApproved: true,
  safeTransactionExecuted: false,
  poolCreated: false,
  liquidityAdded: false,
  movesFunds: false,
  approvesPublicTrading: false,
  approvesFullLaunch: false
}, null, 2));
