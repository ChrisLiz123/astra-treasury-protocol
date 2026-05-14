import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-pool-creation-safe-submission-approval/dex-pool-creation-safe-submission-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const requiredFiles = [
  "configs/dex-pool-creation-safe-submission-approval.config.json",
  "docs/dex-pool-creation-safe-submission-approval/DEX_POOL_CREATION_SAFE_SUBMISSION_APPROVAL.md",
  "docs/dex-pool-creation-safe-submission-approval/DEX_POOL_CREATION_SAFE_SUBMISSION_APPROVAL_CHECKLIST.md",
  "docs/dex-pool-creation-safe-submission-approval/DEX_POOL_CREATION_SAFE_SUBMISSION_BOUNDARIES.md",
  "docs/dex-pool-creation-safe-submission-approval/DEX_POOL_CREATION_SAFE_SUBMISSION_APPROVAL_RUNBOOK.md",
  "scripts/record-dex-pool-creation-safe-submission-approval.mjs",
  "reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json",
  "public-docs/dex-pool-creation-safe-payload-verification-status.json",
  "public-docs/dex-pool-creation-safe-payload-generation-status.json",
  "public-docs/dex-pool-creation-safe-payload-generation-approval-status.json",
  "public-docs/dex-pool-creation-safe-owners-threshold-status.json",
  "public-docs/dex-pool-creation-factory-router-review-status.json",
  "public-docs/dex-pool-creation-token-ordering-sqrtprice-status.json",
  "public-docs/dex-pool-existence-precheck-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/treasury-safe-transaction-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-alerts-status.json",
  "public-docs/incident-summary.json",
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
    issue(file, "Missing required Safe submission approval file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden submission/execution/live artifact exists. Approval must not submit, execute, or create pool.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-pool-creation-safe-submission-approval.config.json");
  const approvalRecordPresent = fs.existsSync(recordPath);

  const verification = readJson("public-docs/dex-pool-creation-safe-payload-verification-status.json");
  const generation = readJson("public-docs/dex-pool-creation-safe-payload-generation-status.json");
  const generationApproval = readJson("public-docs/dex-pool-creation-safe-payload-generation-approval-status.json");
  const precheck = readJson("public-docs/dex-pool-existence-precheck-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");
  const payload = readJson("reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json");

  if (config.approvalPrepared !== true || config.approvalOnly !== true) {
    issue("config", "Safe submission approval must be prepared and approval-only.");
  }

  if (config.safeSubmissionApprovalRecorded !== approvalRecordPresent) {
    issue("config.safeSubmissionApprovalRecorded", "Config approval flag must match record presence.");
  }

  if (config.safeSubmissionApproved !== approvalRecordPresent) {
    issue("config.safeSubmissionApproved", "Config safeSubmissionApproved must be true only after record exists.");
  }

  for (const key of [
    "safeTransactionSubmitted",
    "safeTransactionQueued",
    "safeTransactionPrepared",
    "safeTransactionExecuted",
    "poolCreationExecutionApproved",
    "poolCreated",
    "liquidityProvisionApproved",
    "liquidityAdded",
    "publicTradingApproved",
    "publicTradingLinkApproved",
    "buyPageActivationApproved",
    "treasuryFundingApproved",
    "treasuryFundsMoved",
    "fullLaunchApproved"
  ]) {
    if (config[key] !== false) {
      issue(`config.${key}`, `${key} must remain false.`);
    }
  }

  if (verification.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_VERIFICATION_REVIEW_COMPLETE_NOT_EXECUTED") {
    issue("verification.status", "Safe payload verification must be complete.");
  }

  if (generation.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATED_NOT_EXECUTED") {
    issue("generation.status", "Safe payload generation must be generated/not executed.");
  }

  if (generationApproval.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_GENERATED") {
    issue("generationApproval.status", "Payload generation approval must be recorded.");
  }

  if (precheck.status !== "DEX_POOL_EXISTENCE_FACTORY_PRECHECK_COMPLETE_NO_POOL_FOUND" || precheck.summary?.poolExists !== false) {
    issue("precheck.status", "Fresh no-pool recheck must show no selected pool.");
  }

  if (payload.flags?.safeTransactionSubmitted !== false || payload.flags?.safeTransactionExecuted !== false) {
    issue("payload.flags", "Payload must remain not submitted and not executed.");
  }

  if (payload.flags?.poolCreated !== false || payload.flags?.liquidityAdded !== false || payload.flags?.fundsMoved !== false) {
    issue("payload.flags", "Payload must not indicate pool creation, liquidity, or funds movement.");
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

  if (approvalRecordPresent) {
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));

    if (record.schema !== "astra-dex-pool-creation-safe-submission-approval-record-v0.1") {
      issue("record.schema", "Invalid Safe submission approval record schema.");
    }

    if (record.status !== "DEX_POOL_CREATION_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED") {
      issue("record.status", "Unexpected Safe submission approval record status.");
    }

    if (record.safeSubmissionApproved !== true) {
      issue("record.safeSubmissionApproved", "Record must approve Safe submission only.");
    }

    for (const key of [
      "safeTransactionSubmitted",
      "safeTransactionQueued",
      "safeTransactionPrepared",
      "safeTransactionExecuted",
      "poolCreated",
      "liquidityAdded",
      "publicTradingApproved",
      "publicTradingLinkApproved",
      "buyPageActivated",
      "treasuryFundingApproved",
      "treasuryFundsMoved",
      "fullLaunchApproved"
    ]) {
      if (record[key] !== false) {
        issue(`record.${key}`, `${key} must remain false.`);
      }
    }
  }
}

const result = {
  schema: "astra-dex-pool-creation-safe-submission-approval-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  recordFile: recordRelativePath,
  approvalRecordPresent: fs.existsSync(recordPath),
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
