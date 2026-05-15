import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-pool-creation-safe-execution-approval/dex-pool-creation-safe-execution-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const requiredFiles = [
  "configs/dex-pool-creation-safe-execution-approval.config.json",
  "docs/dex-pool-creation-safe-execution-approval/DEX_POOL_CREATION_SAFE_EXECUTION_APPROVAL.md",
  "docs/dex-pool-creation-safe-execution-approval/DEX_POOL_CREATION_SAFE_EXECUTION_APPROVAL_CHECKLIST.md",
  "docs/dex-pool-creation-safe-execution-approval/DEX_POOL_CREATION_SAFE_EXECUTION_APPROVAL_BOUNDARIES.md",
  "docs/dex-pool-creation-safe-execution-approval/DEX_POOL_CREATION_SAFE_EXECUTION_APPROVAL_RUNBOOK.md",
  "scripts/record-dex-pool-creation-safe-execution-approval.mjs",
  "public-docs/dex-pool-creation-safe-pending-signatures-status.json",
  "public-docs/dex-pool-creation-safe-submission-live-status.json",
  "public-docs/dex-pool-creation-safe-submission-execution-approval-status.json",
  "public-docs/dex-pool-creation-safe-payload-verification-status.json",
  "public-docs/dex-pool-existence-precheck-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
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
    issue(file, "Missing required Safe execution approval file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden execution/live artifact exists. Approval must not execute or create pool.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-pool-creation-safe-execution-approval.config.json");
  const approvalRecordPresent = fs.existsSync(recordPath);

  const pending = readJson("public-docs/dex-pool-creation-safe-pending-signatures-status.json");
  const live = readJson("public-docs/dex-pool-creation-safe-submission-live-status.json");
  const submissionExecutionApproval = readJson("public-docs/dex-pool-creation-safe-submission-execution-approval-status.json");
  const verification = readJson("public-docs/dex-pool-creation-safe-payload-verification-status.json");
  const precheck = readJson("public-docs/dex-pool-existence-precheck-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.approvalPrepared !== true || config.approvalOnly !== true) {
    issue("config", "Safe execution approval must be prepared and approval-only.");
  }

  if (pending.status !== "DEX_POOL_CREATION_SAFE_PENDING_SIGNATURE_MONITORING_THRESHOLD_REACHED_NOT_EXECUTED") {
    issue("pending.status", "Pending signature monitoring must show threshold reached and not executed.");
  }

  if (pending.summary?.thresholdReached !== true) {
    issue("pending.summary.thresholdReached", "Threshold must be reached.");
  }

  if (pending.summary?.safeTransactionExecuted !== false || pending.summary?.poolCreated !== false || pending.summary?.liquidityAdded !== false || pending.summary?.fundsMoved !== false) {
    issue("pending.summary", "Pending monitor must show not executed, no pool, no liquidity, no funds moved.");
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

  if (config.safeExecutionApprovalRecorded !== approvalRecordPresent) {
    issue("config.safeExecutionApprovalRecorded", "Config approval flag must match record presence.");
  }

  if (approvalRecordPresent) {
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));

    if (record.schema !== "astra-dex-pool-creation-safe-execution-approval-record-v0.1") {
      issue("record.schema", "Invalid Safe execution approval record schema.");
    }

    if (record.status !== "DEX_POOL_CREATION_SAFE_EXECUTION_APPROVED_NOT_EXECUTED") {
      issue("record.status", "Unexpected approval record status.");
    }

    if (record.safeTransactionExecutionApproved !== true || record.poolCreationExecutionApproved !== true) {
      issue("record.approval", "Record must approve later Safe execution / pool creation execution.");
    }

    for (const key of [
      "safeTransactionExecuted",
      "poolCreated",
      "liquidityProvisionApproved",
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
  schema: "astra-dex-pool-creation-safe-execution-approval-validation-v0.1",
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
