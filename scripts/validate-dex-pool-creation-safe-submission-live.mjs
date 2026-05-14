import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-pool-creation-safe-submission-live/dex-pool-creation-safe-submission-live-record.json";
const recordPath = path.join(root, recordRelativePath);

const requiredFiles = [
  "configs/dex-pool-creation-safe-submission-live.config.json",
  "docs/dex-pool-creation-safe-submission-live/DEX_POOL_CREATION_SAFE_SUBMISSION_LIVE.md",
  "docs/dex-pool-creation-safe-submission-live/DEX_POOL_CREATION_SAFE_SUBMISSION_LIVE_CHECKLIST.md",
  "docs/dex-pool-creation-safe-submission-live/DEX_POOL_CREATION_SAFE_SUBMISSION_LIVE_BOUNDARIES.md",
  "docs/dex-pool-creation-safe-submission-live/DEX_POOL_CREATION_SAFE_SUBMISSION_LIVE_RUNBOOK.md",
  "scripts/record-dex-pool-creation-safe-submission-live.mjs",
  "public-docs/dex-pool-creation-safe-submission-execution-approval-status.json",
  "public-docs/dex-pool-creation-safe-submission-dry-run-status.json",
  "public-docs/dex-pool-creation-safe-submission-preparation-status.json",
  "public-docs/dex-pool-creation-safe-submission-approval-status.json",
  "public-docs/dex-pool-creation-safe-payload-verification-status.json",
  "public-docs/dex-pool-creation-safe-payload-generation-status.json",
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

function isTxHash(value) {
  return /^0x[0-9a-fA-F]{64}$/.test(String(value || "").trim());
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required Safe submission live file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden execution/live artifact exists. Safe submission live must not execute or create pool.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-pool-creation-safe-submission-live.config.json");
  const liveRecordPresent = fs.existsSync(recordPath);

  const executionApproval = readJson("public-docs/dex-pool-creation-safe-submission-execution-approval-status.json");
  const dryRun = readJson("public-docs/dex-pool-creation-safe-submission-dry-run-status.json");
  const preparation = readJson("public-docs/dex-pool-creation-safe-submission-preparation-status.json");
  const submissionApproval = readJson("public-docs/dex-pool-creation-safe-submission-approval-status.json");
  const verification = readJson("public-docs/dex-pool-creation-safe-payload-verification-status.json");
  const generation = readJson("public-docs/dex-pool-creation-safe-payload-generation-status.json");
  const precheck = readJson("public-docs/dex-pool-existence-precheck-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.liveSubmissionPrepared !== true || config.submissionEvidenceOnly !== true) {
    issue("config", "Safe submission live must be prepared and evidence-only.");
  }

  if (config.safeSubmissionLiveRecorded !== liveRecordPresent) {
    issue("config.safeSubmissionLiveRecorded", "Config live-recorded flag must match record presence.");
  }

  if (executionApproval.status !== "DEX_POOL_CREATION_SAFE_SUBMISSION_EXECUTION_APPROVED_NOT_SUBMITTED") {
    issue("executionApproval.status", "Safe submission execution approval must be recorded.");
  }

  if (dryRun.status !== "DEX_POOL_CREATION_SAFE_SUBMISSION_DRY_RUN_REVIEW_READY_NOT_SUBMITTED") {
    issue("dryRun.status", "Safe submission dry run must be complete.");
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

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Treasury funding must remain not approved and not executed.");
  }

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("execution.mode", "Mainnet execution queue must remain disabled.");
  }

  if (liveRecordPresent) {
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));

    if (record.schema !== "astra-dex-pool-creation-safe-submission-live-record-v0.1") {
      issue("record.schema", "Invalid Safe submission live record schema.");
    }

    if (record.status !== "DEX_POOL_CREATION_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED") {
      issue("record.status", "Unexpected live submission record status.");
    }

    if (!isTxHash(record.safeTxHash)) {
      issue("record.safeTxHash", "safeTxHash must be a 0x-prefixed 32-byte hash.");
    }

    if (!Number.isInteger(record.safeNonce) || record.safeNonce < 0) {
      issue("record.safeNonce", "safeNonce must be a non-negative integer.");
    }

    if (record.safeTransactionSubmitted !== true || record.safeTransactionQueued !== true) {
      issue("record.submission", "Live record must mark submitted and queued/pending.");
    }

    for (const key of [
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
  schema: "astra-dex-pool-creation-safe-submission-live-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  recordFile: recordRelativePath,
  liveRecordPresent: fs.existsSync(recordPath),
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
