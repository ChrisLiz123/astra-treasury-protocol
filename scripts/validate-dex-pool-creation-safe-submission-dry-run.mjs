import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const reviewRelativePath = "reports/dex-pool-creation-safe-submission-dry-run/dex-pool-creation-safe-submission-dry-run-review.json";
const preparationRelativePath = "reports/dex-pool-creation-safe-submission-preparation/dex-pool-creation-safe-submission-preparation.json";
const payloadRelativePath = "reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json";

const requiredFiles = [
  "configs/dex-pool-creation-safe-submission-dry-run.config.json",
  "docs/dex-pool-creation-safe-submission-dry-run/DEX_POOL_CREATION_SAFE_SUBMISSION_DRY_RUN.md",
  "docs/dex-pool-creation-safe-submission-dry-run/DEX_POOL_CREATION_SAFE_SUBMISSION_DRY_RUN_CHECKLIST.md",
  "docs/dex-pool-creation-safe-submission-dry-run/DEX_POOL_CREATION_SAFE_SUBMISSION_DRY_RUN_BOUNDARIES.md",
  "docs/dex-pool-creation-safe-submission-dry-run/DEX_POOL_CREATION_SAFE_SUBMISSION_DRY_RUN_RUNBOOK.md",
  "scripts/prepare-dex-pool-creation-safe-submission-dry-run.mjs",
  reviewRelativePath,
  preparationRelativePath,
  payloadRelativePath,
  "public-docs/dex-pool-creation-safe-submission-preparation-status.json",
  "public-docs/dex-pool-creation-safe-submission-approval-status.json",
  "public-docs/dex-pool-creation-safe-payload-verification-status.json",
  "public-docs/dex-pool-creation-safe-payload-generation-status.json",
  "public-docs/dex-pool-existence-precheck-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
  "reports/dex-pool-creation-safe-submission/submitted/safe-submission-record.json",
  "reports/dex-pool-creation-safe-submission/queued/safe-queued-record.json",
  "reports/dex-pool-creation-safe-execution/executed/safe-execution-record.json",
  "reports/dex-pool-creation/live/dex-pool-created.json",
  "reports/dex-pool-creation/live/pool-created.json",
  "reports/dex-pool-creation/direct/direct-execution-submitted.json",
  "public-docs/dex-pool-created-status.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required Safe submission dry run file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden submission/execution/live artifact exists. Dry run must not submit, execute, or create pool.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-pool-creation-safe-submission-dry-run.config.json");
  const review = readJson(reviewRelativePath);
  const preparation = readJson(preparationRelativePath);
  const payload = readJson(payloadRelativePath);
  const preparationStatus = readJson("public-docs/dex-pool-creation-safe-submission-preparation-status.json");
  const submissionApproval = readJson("public-docs/dex-pool-creation-safe-submission-approval-status.json");
  const verification = readJson("public-docs/dex-pool-creation-safe-payload-verification-status.json");
  const generation = readJson("public-docs/dex-pool-creation-safe-payload-generation-status.json");
  const precheck = readJson("public-docs/dex-pool-existence-precheck-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.dryRunPrepared !== true || config.dryRunOnly !== true) {
    issue("config", "Safe submission dry run must be prepared and dry-run-only.");
  }

  if (review.status !== "DEX_POOL_CREATION_SAFE_SUBMISSION_DRY_RUN_REVIEW_READY_NOT_SUBMITTED") {
    issue("review.status", `Unexpected dry run status: ${review.status}`);
  }

  if (review.dryRunOnly !== true) {
    issue("review.dryRunOnly", "Review must be dry-run-only.");
  }

  if (review.payloadHash !== payload.payloadHash) {
    issue("review.payloadHash", "Dry run payload hash must match generated payload hash.");
  }

  if (review.safeSubmissionCandidateReview?.payloadHashMatches !== true) {
    issue("review.safeSubmissionCandidateReview.payloadHashMatches", "Payload hash match flag must be true.");
  }

  if (review.safeSubmissionCandidateReview?.calldataMatchesPayload !== true) {
    issue("review.safeSubmissionCandidateReview.calldataMatchesPayload", "Calldata match flag must be true.");
  }

  if (review.operatorCommandReview?.safeTransactionServiceApiCallMade !== false) {
    issue("review.operatorCommandReview.safeTransactionServiceApiCallMade", "Dry run must not call Safe Transaction Service.");
  }

  if (review.operatorCommandReview?.safeUiOpenedByAutomation !== false) {
    issue("review.operatorCommandReview.safeUiOpenedByAutomation", "Dry run must not open Safe UI.");
  }

  for (const key of [
    "safeTransactionSubmitted",
    "safeTransactionQueued",
    "safeTransactionExecuted",
    "poolCreated",
    "liquidityAdded",
    "fundsMoved",
    "publicTradingApproved",
    "buyPageActivated",
    "fullLaunchApproved"
  ]) {
    if (review.flags?.[key] !== false) {
      issue(`review.flags.${key}`, `${key} must remain false.`);
    }
  }

  for (const key of [
    "callsSafeTransactionService",
    "opensSafeUi",
    "submitsToSafe",
    "requestsSignatures",
    "queuesSafeTransaction",
    "executesSafeTransaction",
    "createsPool",
    "addsLiquidity",
    "movesFunds",
    "activatesBuyPage",
    "approvesFullLaunch"
  ]) {
    if (review.safety?.[key] !== false) {
      issue(`review.safety.${key}`, `${key} must remain false.`);
    }
  }

  if (preparationStatus.status !== "DEX_POOL_CREATION_SAFE_SUBMISSION_PREPARATION_READY_NOT_SUBMITTED") {
    issue("preparationStatus.status", "Safe submission preparation must be ready.");
  }

  if (submissionApproval.status !== "DEX_POOL_CREATION_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED") {
    issue("submissionApproval.status", "Safe submission approval must be recorded.");
  }

  if (verification.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_VERIFICATION_REVIEW_COMPLETE_NOT_EXECUTED") {
    issue("verification.status", "Safe payload verification must be complete.");
  }

  if (generation.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATED_NOT_EXECUTED") {
    issue("generation.status", "Safe payload must be generated but not executed.");
  }

  if (precheck.status !== "DEX_POOL_EXISTENCE_FACTORY_PRECHECK_COMPLETE_NO_POOL_FOUND" || precheck.summary?.poolExists !== false) {
    issue("precheck.status", "Fresh no-pool recheck must show no selected pool.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Treasury funding must remain not approved and not executed.");
  }

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("execution.mode", "Mainnet execution queue must remain disabled.");
  }

  if (payload.flags?.safeTransactionSubmitted !== false || payload.flags?.safeTransactionExecuted !== false) {
    issue("payload.flags", "Payload must remain not submitted and not executed.");
  }
}

const result = {
  schema: "astra-dex-pool-creation-safe-submission-dry-run-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  dryRunReviewFile: reviewRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
