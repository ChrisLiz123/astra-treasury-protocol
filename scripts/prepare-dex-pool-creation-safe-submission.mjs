import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const reportDir = path.join(root, "reports", "dex-pool-creation-safe-submission-preparation");
const prepFile = path.join(reportDir, "dex-pool-creation-safe-submission-preparation.json");

const payloadRelativePath = "reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json";
const payloadFile = path.join(root, payloadRelativePath);

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value, null, 2) + "\n").digest("hex");
}

function normalizeAddress(value) {
  return String(value || "").trim();
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

fs.mkdirSync(reportDir, { recursive: true });

if (!fs.existsSync(payloadFile)) {
  issue("payloadFile", "Generated Safe payload file is required before Safe submission preparation.");
}

const submissionApproval = readJson("public-docs/dex-pool-creation-safe-submission-approval-status.json");
const verification = readJson("public-docs/dex-pool-creation-safe-payload-verification-status.json");
const generation = readJson("public-docs/dex-pool-creation-safe-payload-generation-status.json");
const generationApproval = readJson("public-docs/dex-pool-creation-safe-payload-generation-approval-status.json");
const precheck = readJson("public-docs/dex-pool-existence-precheck-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const safeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireStatus("submissionApproval.status", submissionApproval.status, "DEX_POOL_CREATION_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED");
requireStatus("verification.status", verification.status, "DEX_POOL_CREATION_SAFE_PAYLOAD_VERIFICATION_REVIEW_COMPLETE_NOT_EXECUTED");
requireStatus("generation.status", generation.status, "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATED_NOT_EXECUTED");
requireStatus("generationApproval.status", generationApproval.status, "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_GENERATED");

if (precheck.status !== "DEX_POOL_EXISTENCE_FACTORY_PRECHECK_COMPLETE_NO_POOL_FOUND" || precheck.summary?.poolExists !== false) {
  issue("precheck.status", "Fresh no-pool recheck must show no selected pool.");
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
  "reports/dex-pool-creation-safe-submission/submitted/safe-submission-record.json",
  "reports/dex-pool-creation-safe-submission/queued/safe-queued-record.json",
  "reports/dex-pool-creation-safe-execution/executed/safe-execution-record.json",
  "reports/dex-pool-creation/live/dex-pool-created.json",
  "reports/dex-pool-creation/live/pool-created.json",
  "reports/dex-pool-creation/direct/direct-execution-submitted.json",
  "public-docs/dex-pool-created-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden submission/execution/live artifact exists. Preparation must not submit, execute, or create a pool.");
  }
}

let payload = {};

if (fs.existsSync(payloadFile)) {
  payload = readJson(payloadRelativePath);

  if (payload.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATED_NOT_EXECUTED") {
    issue("payload.status", "Payload must be generated but not executed.");
  }

  if (!isAddress(payload.safeAddress)) {
    issue("payload.safeAddress", "Payload Safe address must be valid.");
  }

  if (!isAddress(payload.transaction?.to)) {
    issue("payload.transaction.to", "Payload target address must be valid.");
  }

  if (payload.flags?.safeTransactionSubmitted !== false || payload.flags?.safeTransactionExecuted !== false) {
    issue("payload.flags", "Payload must remain not submitted and not executed.");
  }

  if (payload.flags?.poolCreated !== false || payload.flags?.liquidityAdded !== false || payload.flags?.fundsMoved !== false) {
    issue("payload.flags", "Payload must not indicate pool creation, liquidity, or funds movement.");
  }
}

const status = issues.length === 0
  ? "DEX_POOL_CREATION_SAFE_SUBMISSION_PREPARATION_READY_NOT_SUBMITTED"
  : "DEX_POOL_CREATION_SAFE_SUBMISSION_PREPARATION_REVIEW_REQUIRED";

const preparation = {
  schema: "astra-dex-pool-creation-safe-submission-preparation-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  preparationOnly: true,
  payloadReference: payloadRelativePath,
  payloadHash: payload.payloadHash || "",
  safeSubmissionCandidate: {
    chainId: payload.network?.chainId || 8453,
    safeAddress: normalizeAddress(payload.safeAddress || ""),
    to: normalizeAddress(payload.transaction?.to || ""),
    value: payload.transaction?.value || "0",
    data: payload.transaction?.data || "",
    operation: payload.transaction?.operation || "CALL",
    operationValue: payload.transaction?.operationValue ?? 0,
    functionSelector: payload.transaction?.functionSelector || "",
    functionSignature: payload.transaction?.functionSignature || "",
    parameters: payload.transaction?.parameters || {}
  },
  operatorChecklist: [
    "Confirm Safe address in the Safe UI before any submission.",
    "Confirm target contract address matches the verified NonfungiblePositionManager target.",
    "Confirm value is zero.",
    "Confirm calldata matches the verified local payload.",
    "Run a fresh no-pool recheck immediately before any submission.",
    "Record separate Safe submission execution approval before actual submission.",
    "Do not execute the Safe transaction during submission preparation."
  ],
  requiredBeforeActualSafeSubmission: {
    safeSubmissionPreparationReady: true,
    freshNoPoolRecheckImmediatelyBeforeSubmission: true,
    operatorSafeSubmissionCommandReviewed: false,
    safeSubmissionExecutionApprovalRecorded: false,
    publicStatusUpdatePrepared: false,
    postSubmissionMonitoringPlanReady: false
  },
  flags: {
    safeSubmissionPreparationReady: issues.length === 0,
    safeTransactionSubmitted: false,
    safeTransactionQueued: false,
    safeTransactionExecuted: false,
    poolCreated: false,
    liquidityAdded: false,
    fundsMoved: false,
    publicTradingApproved: false,
    buyPageActivated: false,
    fullLaunchApproved: false
  },
  safety: {
    callsSafeTransactionService: false,
    opensSafeUi: false,
    submitsToSafe: false,
    requestsSignatures: false,
    queuesSafeTransaction: false,
    executesSafeTransaction: false,
    createsPool: false,
    addsLiquidity: false,
    movesFunds: false,
    activatesBuyPage: false,
    approvesFullLaunch: false
  },
  issues
};

preparation.preparationHash = sha256Json(preparation);

writeJson(prepFile, preparation);

console.log(JSON.stringify({
  schema: "astra-dex-pool-creation-safe-submission-preparation-result-v0.1",
  checkedAt: preparation.generatedAt,
  status,
  preparationFile: "reports/dex-pool-creation-safe-submission-preparation/dex-pool-creation-safe-submission-preparation.json",
  preparationHash: preparation.preparationHash,
  payloadHash: preparation.payloadHash,
  safeAddress: preparation.safeSubmissionCandidate.safeAddress,
  targetAddress: preparation.safeSubmissionCandidate.to,
  safeTransactionSubmitted: false,
  safeTransactionQueued: false,
  safeTransactionExecuted: false,
  poolCreated: false,
  liquidityAdded: false,
  movesFunds: false,
  issues
}, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
