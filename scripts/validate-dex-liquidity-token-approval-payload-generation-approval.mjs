import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-liquidity-token-approval-payload-generation-approval/dex-liquidity-token-approval-payload-generation-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const requiredFiles = [
  "configs/dex-liquidity-token-approval-payload-generation-approval.config.json",
  "docs/dex-liquidity-token-approval-payload-generation-approval/DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVAL.md",
  "docs/dex-liquidity-token-approval-payload-generation-approval/DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVAL_CHECKLIST.md",
  "docs/dex-liquidity-token-approval-payload-generation-approval/DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVAL_BOUNDARIES.md",
  "docs/dex-liquidity-token-approval-payload-generation-approval/DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVAL_RUNBOOK.md",
  "scripts/record-dex-liquidity-token-approval-payload-generation-approval.mjs",
  "public-docs/dex-liquidity-token-approval-requirements-recheck-status.json",
  "reports/dex-liquidity-token-approval-requirements-recheck/dex-liquidity-token-approval-requirements-recheck.json",
  "public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json",
  "public-docs/dex-liquidity-funding-transfer-safe-execution-live-status.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
  "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json",
  "reports/dex-liquidity-token-approval/live/token-approval-executed.json",
  "reports/dex-liquidity-provision/payload/token-approval-safe-payload.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
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

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required token approval payload generation approval file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden token-approval/liquidity/public-trading artifact exists. Approval must not generate or execute approvals.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-token-approval-payload-generation-approval.config.json");
  const approvalRecordPresent = fs.existsSync(recordPath);

  const recheckStatus = readJson("public-docs/dex-liquidity-token-approval-requirements-recheck-status.json");
  const recheck = readJson("reports/dex-liquidity-token-approval-requirements-recheck/dex-liquidity-token-approval-requirements-recheck.json");
  const postBalances = readJson("public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json");
  const executionLive = readJson("public-docs/dex-liquidity-funding-transfer-safe-execution-live-status.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.approvalPrepared !== true || config.approvalOnly !== true) {
    issue("config", "Token approval payload generation approval config must be prepared and approval-only.");
  }

  if (config.tokenApprovalPayloadGenerationApprovalRecorded !== approvalRecordPresent) {
    issue("config.tokenApprovalPayloadGenerationApprovalRecorded", "Config approval flag must match record presence.");
  }

  if (config.tokenApprovalPayloadGenerationApproved !== approvalRecordPresent) {
    issue("config.tokenApprovalPayloadGenerationApproved", "Config approved flag must be true only after record exists.");
  }

  for (const key of [
    "tokenApprovalPayloadGenerated",
    "tokenApprovalExecuted",
    "liquidityMintCalldataGenerated",
    "liquiditySafePayloadGenerated",
    "liquiditySafeTransactionSubmitted",
    "liquiditySafeTransactionExecuted",
    "liquidityAdded",
    "positionMinted",
    "publicTradingApproved",
    "publicTradingLinkApproved",
    "buyPageActivationApproved",
    "fullLaunchApproved"
  ]) {
    if (config[key] !== false) {
      issue(`config.${key}`, `${key} must remain false.`);
    }
  }

  if (recheckStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK_COMPLETE_APPROVALS_REQUIRED_NO_APPROVALS_EXECUTED") {
    issue("recheckStatus.status", "Token approval requirements recheck must show approvals required and no approvals executed.");
  }

  if (recheckStatus.summary?.tokenApprovalsRequiredBeforeLiquidity !== true) {
    issue("recheckStatus.summary.tokenApprovalsRequiredBeforeLiquidity", "Approvals must be required before liquidity.");
  }

  if (recheckStatus.summary?.allRequiredBalancesAvailable !== true) {
    issue("recheckStatus.summary.allRequiredBalancesAvailable", "All required balances must be available.");
  }

  if (recheckStatus.summary?.tokenApprovalPayloadGenerated !== false || recheckStatus.summary?.tokenApprovalExecuted !== false || recheckStatus.summary?.liquidityAdded !== false) {
    issue("recheckStatus.summary.flags", "Recheck must show no approval payload, no approval execution, and no liquidity.");
  }

  if (!isAddress(recheck.liquiditySafeAddress)) {
    issue("recheck.liquiditySafeAddress", "Liquidity Safe address must be valid.");
  }

  if (!isAddress(recheck.approvalSpender)) {
    issue("recheck.approvalSpender", "Approval spender must be valid.");
  }

  const requiredApprovalItems = Array.isArray(recheck.tokenApprovalRequirements)
    ? recheck.tokenApprovalRequirements.filter((item) => item.approvalRequired === true)
    : [];

  if (requiredApprovalItems.length <= 0) {
    issue("recheck.tokenApprovalRequirements", "At least one approval must be required.");
  }

  if (postBalances.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_VERIFIED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("postBalances.status", "Post-execution balances must be verified.");
  }

  if (executionLive.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_EXECUTION_LIVE_RECORDED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("executionLive.status", "Funding transfer execution live status must be recorded.");
  }

  if (poolStatus.status !== "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("poolStatus.status", "Pool must remain no-liquidity/no-public-trading.");
  }

  if (poolStatus.summary?.liquidityVerifiedZero !== true || String(poolStatus.summary?.poolLiquidity || "") !== "0") {
    issue("poolStatus.summary.poolLiquidity", "Pool liquidity must remain zero.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Global treasury funding must remain not approved/executed.");
  }

  if (capabilityMatrix.allCapabilitiesDisabled !== true || capabilityMatrix.allCapabilityApprovalsFalse !== true) {
    issue("capabilityMatrix", "Capability Matrix must remain all-disabled.");
  }

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("execution.mode", "Mainnet execution queue must remain disabled.");
  }

  if (approvalRecordPresent) {
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));

    if (record.schema !== "astra-dex-liquidity-token-approval-payload-generation-approval-record-v0.1") {
      issue("record.schema", "Invalid approval record schema.");
    }

    if (record.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_NO_APPROVALS_EXECUTED") {
      issue("record.status", "Unexpected approval record status.");
    }

    if (record.tokenApprovalPayloadGenerationApproved !== true) {
      issue("record.tokenApprovalPayloadGenerationApproved", "Payload generation approval must be true after recording.");
    }

    if (!isAddress(record.liquiditySafeAddress) || !isAddress(record.approvalSpender)) {
      issue("record.addresses", "Liquidity Safe and approval spender must be valid.");
    }

    if (!Array.isArray(record.requiredApprovalTokenRequirements) || record.requiredApprovalTokenRequirements.length <= 0) {
      issue("record.requiredApprovalTokenRequirements", "Required approval token requirements must be present.");
    }

    for (const key of [
      "tokenApprovalPayloadGenerated",
      "tokenApprovalExecuted",
      "liquidityMintCalldataGenerated",
      "liquiditySafePayloadGenerated",
      "liquiditySafeTransactionSubmitted",
      "liquiditySafeTransactionExecuted",
      "liquidityAdded",
      "positionMinted",
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
  schema: "astra-dex-liquidity-token-approval-payload-generation-approval-validation-v0.1",
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
