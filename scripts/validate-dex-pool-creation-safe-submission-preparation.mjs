import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const prepRelativePath = "reports/dex-pool-creation-safe-submission-preparation/dex-pool-creation-safe-submission-preparation.json";
const payloadRelativePath = "reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json";

const requiredFiles = [
  "configs/dex-pool-creation-safe-submission-preparation.config.json",
  "docs/dex-pool-creation-safe-submission-preparation/DEX_POOL_CREATION_SAFE_SUBMISSION_PREPARATION.md",
  "docs/dex-pool-creation-safe-submission-preparation/DEX_POOL_CREATION_SAFE_SUBMISSION_PREPARATION_CHECKLIST.md",
  "docs/dex-pool-creation-safe-submission-preparation/DEX_POOL_CREATION_SAFE_SUBMISSION_PREPARATION_BOUNDARIES.md",
  "docs/dex-pool-creation-safe-submission-preparation/DEX_POOL_CREATION_SAFE_SUBMISSION_PREPARATION_RUNBOOK.md",
  "scripts/prepare-dex-pool-creation-safe-submission.mjs",
  prepRelativePath,
  payloadRelativePath,
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
    issue(file, "Missing required Safe submission preparation file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden submission/execution/live artifact exists. Preparation must not submit, execute, or create pool.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-pool-creation-safe-submission-preparation.config.json");
  const prep = readJson(prepRelativePath);
  const payload = readJson(payloadRelativePath);
  const submissionApproval = readJson("public-docs/dex-pool-creation-safe-submission-approval-status.json");
  const verification = readJson("public-docs/dex-pool-creation-safe-payload-verification-status.json");
  const generation = readJson("public-docs/dex-pool-creation-safe-payload-generation-status.json");
  const precheck = readJson("public-docs/dex-pool-existence-precheck-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.preparationPrepared !== true || config.preparationOnly !== true) {
    issue("config", "Safe submission preparation must be prepared and preparation-only.");
  }

  if (prep.status !== "DEX_POOL_CREATION_SAFE_SUBMISSION_PREPARATION_READY_NOT_SUBMITTED") {
    issue("prep.status", `Unexpected preparation status: ${prep.status}`);
  }

  if (prep.preparationOnly !== true) {
    issue("prep.preparationOnly", "Preparation must be preparation-only.");
  }

  if (prep.payloadHash !== payload.payloadHash) {
    issue("prep.payloadHash", "Preparation payload hash must match generated payload hash.");
  }

  if (prep.safeSubmissionCandidate?.data !== payload.transaction?.data) {
    issue("prep.safeSubmissionCandidate.data", "Prepared calldata must match generated payload calldata.");
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
    if (prep.flags?.[key] !== false) {
      issue(`prep.flags.${key}`, `${key} must remain false.`);
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
    if (prep.safety?.[key] !== false) {
      issue(`prep.safety.${key}`, `${key} must remain false.`);
    }
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
}

const result = {
  schema: "astra-dex-pool-creation-safe-submission-preparation-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  preparationFile: prepRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
