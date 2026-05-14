import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const reportDir = path.join(root, "reports", "dex-pool-creation-safe-submission-dry-run");
const reviewFile = path.join(reportDir, "dex-pool-creation-safe-submission-dry-run-review.json");

const preparationRelativePath = "reports/dex-pool-creation-safe-submission-preparation/dex-pool-creation-safe-submission-preparation.json";
const payloadRelativePath = "reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json";

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

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

fs.mkdirSync(reportDir, { recursive: true });

const preparation = readJson(preparationRelativePath);
const payload = readJson(payloadRelativePath);

const preparationStatus = readJson("public-docs/dex-pool-creation-safe-submission-preparation-status.json");
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

requireStatus("preparationStatus.status", preparationStatus.status, "DEX_POOL_CREATION_SAFE_SUBMISSION_PREPARATION_READY_NOT_SUBMITTED");
requireStatus("submissionApproval.status", submissionApproval.status, "DEX_POOL_CREATION_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED");
requireStatus("verification.status", verification.status, "DEX_POOL_CREATION_SAFE_PAYLOAD_VERIFICATION_REVIEW_COMPLETE_NOT_EXECUTED");
requireStatus("generation.status", generation.status, "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATED_NOT_EXECUTED");

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
    issue(file, "Forbidden submission/execution/live artifact exists. Dry run must not submit, execute, or create a pool.");
  }
}

const candidate = preparation.safeSubmissionCandidate || {};

if (!isAddress(candidate.safeAddress)) {
  issue("candidate.safeAddress", "Candidate Safe address must be valid.");
}

if (!isAddress(candidate.to)) {
  issue("candidate.to", "Candidate target address must be valid.");
}

if (candidate.value !== "0") {
  issue("candidate.value", "Candidate value must be zero.");
}

if (candidate.operation !== "CALL" || candidate.operationValue !== 0) {
  issue("candidate.operation", "Candidate operation must be CALL / 0.");
}

if (candidate.data !== payload.transaction?.data) {
  issue("candidate.data", "Candidate calldata must match generated payload calldata.");
}

if (preparation.payloadHash !== payload.payloadHash) {
  issue("preparation.payloadHash", "Preparation payload hash must match generated payload hash.");
}

if (payload.flags?.safeTransactionSubmitted !== false || payload.flags?.safeTransactionExecuted !== false) {
  issue("payload.flags", "Payload must remain not submitted and not executed.");
}

if (payload.flags?.poolCreated !== false || payload.flags?.liquidityAdded !== false || payload.flags?.fundsMoved !== false) {
  issue("payload.flags", "Payload must not indicate pool creation, liquidity, or funds movement.");
}

const status = issues.length === 0
  ? "DEX_POOL_CREATION_SAFE_SUBMISSION_DRY_RUN_REVIEW_READY_NOT_SUBMITTED"
  : "DEX_POOL_CREATION_SAFE_SUBMISSION_DRY_RUN_REVIEW_REQUIRED";

const dataHash = crypto.createHash("sha256").update(String(candidate.data || "")).digest("hex");

const review = {
  schema: "astra-dex-pool-creation-safe-submission-dry-run-review-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  dryRunOnly: true,
  payloadReference: payloadRelativePath,
  preparationReference: preparationRelativePath,
  payloadHash: payload.payloadHash || "",
  safeSubmissionCandidateReview: {
    chainId: candidate.chainId || 8453,
    safeAddress: candidate.safeAddress || "",
    to: candidate.to || "",
    value: candidate.value || "0",
    dataHash,
    dataBytes: candidate.data ? (candidate.data.length - 2) / 2 : 0,
    operation: candidate.operation || "CALL",
    operationValue: candidate.operationValue ?? 0,
    functionSelector: candidate.functionSelector || "",
    functionSignature: candidate.functionSignature || "",
    payloadHashMatches: preparation.payloadHash === payload.payloadHash,
    calldataMatchesPayload: candidate.data === payload.transaction?.data
  },
  operatorCommandReview: {
    reviewOnly: true,
    safeTransactionServiceApiCallMade: false,
    safeUiOpenedByAutomation: false,
    apiKeyRequiredForThisDryRun: false,
    submissionMethodForLaterStep: "Operator-reviewed manual Safe UI or Safe Transaction Service/API Kit flow",
    commandTemplateStatus: "review-only-not-executable",
    commandTemplate: [
      "Review the Safe address, target, value, operation, calldata hash, and payload hash.",
      "Run a fresh no-pool recheck immediately before actual submission.",
      "Record Safe submission execution approval before actual submission.",
      "Submit only in the later dedicated submission step."
    ],
    forbiddenDuringDryRun: [
      "Do not POST to Safe Transaction Service.",
      "Do not open Safe UI to submit.",
      "Do not request signatures.",
      "Do not queue a Safe transaction.",
      "Do not execute a Safe transaction."
    ]
  },
  requiredBeforeActualSafeSubmission: {
    safeSubmissionPreparationReady: true,
    safeSubmissionDryRunReviewComplete: issues.length === 0,
    freshNoPoolRecheckImmediatelyBeforeSubmission: true,
    operatorSafeSubmissionCommandReviewed: issues.length === 0,
    safeSubmissionExecutionApprovalRecorded: false,
    publicStatusUpdatePrepared: false,
    postSubmissionMonitoringPlanReady: false
  },
  flags: {
    safeSubmissionDryRunReady: issues.length === 0,
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

review.dryRunReviewHash = sha256Json(review);

writeJson(reviewFile, review);

console.log(JSON.stringify({
  schema: "astra-dex-pool-creation-safe-submission-dry-run-review-result-v0.1",
  checkedAt: review.generatedAt,
  status,
  dryRunReviewFile: "reports/dex-pool-creation-safe-submission-dry-run/dex-pool-creation-safe-submission-dry-run-review.json",
  dryRunReviewHash: review.dryRunReviewHash,
  payloadHash: review.payloadHash,
  safeAddress: review.safeSubmissionCandidateReview.safeAddress,
  targetAddress: review.safeSubmissionCandidateReview.to,
  dataHash,
  callsSafeTransactionService: false,
  submitsToSafe: false,
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
