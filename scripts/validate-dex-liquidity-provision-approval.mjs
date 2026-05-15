import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-liquidity-provision-approval/dex-liquidity-provision-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const requiredFiles = [
  "configs/dex-liquidity-provision-approval.config.json",
  "docs/dex-liquidity-provision-approval/DEX_LIQUIDITY_PROVISION_APPROVAL.md",
  "docs/dex-liquidity-provision-approval/DEX_LIQUIDITY_PROVISION_APPROVAL_CHECKLIST.md",
  "docs/dex-liquidity-provision-approval/DEX_LIQUIDITY_PROVISION_APPROVAL_BOUNDARIES.md",
  "docs/dex-liquidity-provision-approval/DEX_LIQUIDITY_PROVISION_APPROVAL_RUNBOOK.md",
  "scripts/record-dex-liquidity-provision-approval.mjs",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/dex-pool-creation-safe-execution-live-status.json",
  "reports/dex-pool-creation/live/dex-pool-created.json",
  "public-docs/dex-liquidity-parameter-approval-status.json",
  "public-docs/dex-liquidity-source-safe-impact-status.json",
  "public-docs/dex-liquidity-parameter-selection-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-alerts-status.json",
  "public-docs/incident-summary.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/payload/token-approval-safe-payload.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function isZeroAddress(value) {
  return String(value || "").toLowerCase() === "0x0000000000000000000000000000000000000000";
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required liquidity provision approval file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden liquidity/public-trading artifact exists. Approval must not add liquidity or enable trading.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-provision-approval.config.json");
  const approvalRecordPresent = fs.existsSync(recordPath);

  const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const executionLive = readJson("public-docs/dex-pool-creation-safe-execution-live-status.json");
  const poolCreated = readJson("reports/dex-pool-creation/live/dex-pool-created.json");
  const parameterApproval = readJson("public-docs/dex-liquidity-parameter-approval-status.json");
  const sourceSafeImpact = readJson("public-docs/dex-liquidity-source-safe-impact-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.approvalPrepared !== true || config.approvalOnly !== true) {
    issue("config", "Liquidity provision approval must be prepared and approval-only.");
  }

  if (config.liquidityProvisionApprovalRecorded !== approvalRecordPresent) {
    issue("config.liquidityProvisionApprovalRecorded", "Config approval flag must match record presence.");
  }

  if (config.liquidityProvisionApproved !== approvalRecordPresent) {
    issue("config.liquidityProvisionApproved", "Config approved flag must be true only after record exists.");
  }

  for (const key of [
    "liquiditySafePayloadGenerationApproved",
    "liquiditySafePayloadGenerated",
    "liquiditySafeTransactionSubmitted",
    "liquiditySafeTransactionExecuted",
    "tokenApprovalPayloadGenerated",
    "tokenApprovalExecuted",
    "liquidityAdded",
    "positionMinted",
    "treasuryFundingApproved",
    "treasuryFundsMoved",
    "publicTradingApproved",
    "publicTradingLinkApproved",
    "buyPageActivationApproved",
    "fullLaunchApproved"
  ]) {
    if (config[key] !== false) {
      issue(`config.${key}`, `${key} must remain false.`);
    }
  }

  if (postExecution.status !== "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("postExecution.status", "Post-execution pool verification must be complete.");
  }

  if (postExecution.summary?.poolVerified !== true) {
    issue("postExecution.summary.poolVerified", "Pool must be verified.");
  }

  if (!isAddress(postExecution.summary?.poolAddress) || isZeroAddress(postExecution.summary?.poolAddress)) {
    issue("postExecution.summary.poolAddress", "Pool address must be non-zero.");
  }

  if (postExecution.summary?.liquidityVerifiedZero !== true || String(postExecution.summary?.poolLiquidity || "") !== "0") {
    issue("postExecution.summary.poolLiquidity", "Pool liquidity must be zero.");
  }

  if (postExecution.summary?.liquidityAdded !== false || postExecution.summary?.fundsMoved !== false || postExecution.summary?.publicTradingApproved !== false) {
    issue("postExecution.summary.flags", "Post-execution verification must show no liquidity, no funds moved, and no public trading.");
  }

  if (executionLive.status !== "DEX_POOL_CREATION_SAFE_EXECUTION_LIVE_RECORDED_POOL_CREATED_NO_LIQUIDITY") {
    issue("executionLive.status", "Safe execution live must be recorded.");
  }

  if (poolCreated.status !== "DEX_POOL_CREATED_BY_SAFE_EXECUTION_NO_LIQUIDITY") {
    issue("poolCreated.status", "Pool-created record must show no liquidity.");
  }

  if (parameterApproval.status !== "DEX_LIQUIDITY_PARAMETERS_APPROVED_NO_POOL_NO_LIQUIDITY") {
    issue("parameterApproval.status", "DEX liquidity parameters must be approved.");
  }

  if (sourceSafeImpact.status !== "DEX_LIQUIDITY_SOURCE_SAFE_IMPACT_APPROVED_NO_FUNDS_NO_SAFE_PAYLOAD") {
    issue("sourceSafeImpact.status", "Liquidity source/Safe impact must be approved.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Treasury funding must remain not approved and not executed.");
  }

  if (capabilityMatrix.allCapabilitiesDisabled !== true || capabilityMatrix.allCapabilityApprovalsFalse !== true) {
    issue("capabilityMatrix", "Capability Matrix must remain all-disabled.");
  }

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("execution.mode", "Mainnet execution queue must remain disabled.");
  }

  if (approvalRecordPresent) {
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));

    if (record.schema !== "astra-dex-liquidity-provision-approval-record-v0.1") {
      issue("record.schema", "Invalid liquidity provision approval record schema.");
    }

    if (record.status !== "DEX_LIQUIDITY_PROVISION_APPROVED_NO_LIQUIDITY_ADDED_NO_FUNDS_MOVED") {
      issue("record.status", "Unexpected liquidity provision approval status.");
    }

    if (record.liquidityProvisionApproved !== true) {
      issue("record.liquidityProvisionApproved", "Record must approve liquidity provision planning.");
    }

    for (const key of [
      "liquiditySafePayloadGenerated",
      "liquiditySafeTransactionSubmitted",
      "liquiditySafeTransactionExecuted",
      "tokenApprovalPayloadGenerated",
      "tokenApprovalExecuted",
      "liquidityAdded",
      "positionMinted",
      "treasuryFundingApproved",
      "treasuryFundsMoved",
      "publicTradingApproved",
      "publicTradingLinkApproved",
      "buyPageActivated",
      "fullLaunchApproved"
    ]) {
      if (record[key] !== false) {
        issue(`record.${key}`, `${key} must remain false.`);
      }
    }
  }
}

const result = {
  schema: "astra-dex-liquidity-provision-approval-validation-v0.1",
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
