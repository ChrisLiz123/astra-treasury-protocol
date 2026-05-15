import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-liquidity-funding-transfer-payload-generation-approval/dex-liquidity-funding-transfer-payload-generation-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const requiredFiles = [
  "configs/dex-liquidity-funding-transfer-payload-generation-approval.config.json",
  "docs/dex-liquidity-funding-transfer-payload-generation-approval/DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVAL.md",
  "docs/dex-liquidity-funding-transfer-payload-generation-approval/DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVAL_CHECKLIST.md",
  "docs/dex-liquidity-funding-transfer-payload-generation-approval/DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVAL_BOUNDARIES.md",
  "docs/dex-liquidity-funding-transfer-payload-generation-approval/DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVAL_RUNBOOK.md",
  "scripts/record-dex-liquidity-funding-transfer-payload-generation-approval.mjs",
  "public-docs/dex-liquidity-funding-transfer-approval-status.json",
  "reports/dex-liquidity-funding-transfer-approval/dex-liquidity-funding-transfer-approval-record.json",
  "public-docs/dex-liquidity-funding-transfer-requirements-status.json",
  "reports/dex-liquidity-funding-transfer-requirements/dex-liquidity-funding-transfer-requirements-review.json",
  "public-docs/dex-liquidity-treasury-funding-approval-status.json",
  "public-docs/dex-liquidity-mint-parameter-review-status.json",
  "public-docs/dex-liquidity-token-approval-requirements-status.json",
  "public-docs/dex-liquidity-provision-approval-status.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/payload/token-approval-safe-payload.json",
  "reports/dex-liquidity-treasury-funding/live/funds-moved.json",
  "reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json",
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
    issue(file, "Missing required funding-transfer payload generation approval file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden funding/liquidity/public-trading artifact exists. Approval must not generate payloads or move funds.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-funding-transfer-payload-generation-approval.config.json");
  const approvalRecordPresent = fs.existsSync(recordPath);

  const transferApproval = readJson("public-docs/dex-liquidity-funding-transfer-approval-status.json");
  const requirementsStatus = readJson("public-docs/dex-liquidity-funding-transfer-requirements-status.json");
  const requirementsReview = readJson("reports/dex-liquidity-funding-transfer-requirements/dex-liquidity-funding-transfer-requirements-review.json");
  const fundingApproval = readJson("public-docs/dex-liquidity-treasury-funding-approval-status.json");
  const mintReview = readJson("public-docs/dex-liquidity-mint-parameter-review-status.json");
  const tokenApproval = readJson("public-docs/dex-liquidity-token-approval-requirements-status.json");
  const liquidityApproval = readJson("public-docs/dex-liquidity-provision-approval-status.json");
  const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.approvalPrepared !== true || config.approvalOnly !== true) {
    issue("config", "Funding-transfer payload generation approval must be prepared and approval-only.");
  }

  if (config.fundingTransferPayloadGenerationApprovalRecorded !== approvalRecordPresent) {
    issue("config.fundingTransferPayloadGenerationApprovalRecorded", "Config approval flag must match record presence.");
  }

  if (config.fundingTransferPayloadGenerationApproved !== approvalRecordPresent) {
    issue("config.fundingTransferPayloadGenerationApproved", "Config approved flag must be true only after record exists.");
  }

  for (const key of [
    "fundingTransferPayloadGenerated",
    "fundingTransferSafePayloadGenerated",
    "fundingTransferSubmitted",
    "fundingTransferExecuted",
    "treasuryFundsMoved",
    "globalTreasuryFundingApproved",
    "globalTreasuryFundingExecuted",
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

  if (transferApproval.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_APPROVED_NO_PAYLOAD_NO_FUNDS_MOVED") {
    issue("transferApproval.status", "Funding transfer approval must be recorded.");
  }

  if (transferApproval.summary?.fundingTransferApproved !== true) {
    issue("transferApproval.summary.fundingTransferApproved", "Funding transfer plan must be approved.");
  }

  if (transferApproval.summary?.fundingTransferPayloadGenerated !== false || transferApproval.summary?.fundingTransferExecuted !== false || transferApproval.summary?.treasuryFundsMoved !== false) {
    issue("transferApproval.summary.flags", "Funding transfer approval must show no payload, no execution, and no treasury funds moved.");
  }

  if (requirementsStatus.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_REQUIREMENTS_REVIEW_COMPLETE_NO_FUNDS_MOVED") {
    issue("requirementsStatus.status", "Funding transfer requirements review must be complete.");
  }

  if (requirementsStatus.summary?.sourceAddressProvided !== true || requirementsStatus.summary?.sourceAddressRequiredBeforePayloadGeneration !== false) {
    issue("requirementsStatus.summary.sourceAddress", "Funding source address must be recorded.");
  }

  if (!isAddress(requirementsReview.fundingSource?.sourceAddress) || isZeroAddress(requirementsReview.fundingSource?.sourceAddress)) {
    issue("requirementsReview.fundingSource.sourceAddress", "Funding source address must be valid.");
  }

  if (!isAddress(requirementsReview.fundingDestination?.destinationSafeAddress) || isZeroAddress(requirementsReview.fundingDestination?.destinationSafeAddress)) {
    issue("requirementsReview.fundingDestination.destinationSafeAddress", "Destination Safe must be valid.");
  }

  const tokenTransferRequirements = requirementsReview.fundingTransferRequirements?.tokenTransferRequirements || [];
  const tokensRequiringFunding = tokenTransferRequirements.filter((item) => item.fundingTransferRequiredForThisToken === true);

  if (tokensRequiringFunding.length <= 0) {
    issue("tokenTransferRequirements", "At least one token must require funding.");
  }

  if (fundingApproval.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_APPROVED_NO_FUNDS_MOVED_NO_LIQUIDITY_ADDED") {
    issue("fundingApproval.status", "DEX liquidity treasury funding approval must be recorded.");
  }

  if (mintReview.status !== "DEX_LIQUIDITY_MINT_PARAMETER_REVIEW_COMPLETE_NO_PAYLOAD_NO_LIQUIDITY") {
    issue("mintReview.status", "Mint parameter review must be complete.");
  }

  if (tokenApproval.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_REVIEW_COMPLETE_NO_APPROVALS_EXECUTED") {
    issue("tokenApproval.status", "Token approval requirements review must be complete.");
  }

  if (liquidityApproval.status !== "DEX_LIQUIDITY_PROVISION_APPROVED_NO_LIQUIDITY_ADDED_NO_FUNDS_MOVED") {
    issue("liquidityApproval.status", "Liquidity provision planning approval must be recorded.");
  }

  if (postExecution.status !== "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("postExecution.status", "Post-execution pool verification must be complete.");
  }

  if (postExecution.summary?.liquidityVerifiedZero !== true || String(postExecution.summary?.poolLiquidity || "") !== "0") {
    issue("postExecution.summary.poolLiquidity", "Pool liquidity must remain zero.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Global treasury funding must remain not approved and not executed.");
  }

  if (capabilityMatrix.allCapabilitiesDisabled !== true || capabilityMatrix.allCapabilityApprovalsFalse !== true) {
    issue("capabilityMatrix", "Capability Matrix must remain all-disabled.");
  }

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("execution.mode", "Mainnet execution queue must remain disabled.");
  }

  if (approvalRecordPresent) {
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));

    if (record.schema !== "astra-dex-liquidity-funding-transfer-payload-generation-approval-record-v0.1") {
      issue("record.schema", "Invalid funding-transfer payload generation approval record schema.");
    }

    if (record.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_NO_FUNDS_MOVED") {
      issue("record.status", "Unexpected funding-transfer payload generation approval status.");
    }

    if (record.fundingTransferPayloadGenerationApproved !== true) {
      issue("record.fundingTransferPayloadGenerationApproved", "Record must approve funding-transfer payload generation.");
    }

    if (!isAddress(record.sourceAddress) || isZeroAddress(record.sourceAddress)) {
      issue("record.sourceAddress", "Source address must be valid.");
    }

    if (!isAddress(record.destinationSafeAddress) || isZeroAddress(record.destinationSafeAddress)) {
      issue("record.destinationSafeAddress", "Destination Safe must be valid.");
    }

    for (const key of [
      "fundingTransferPayloadGenerated",
      "fundingTransferSafePayloadGenerated",
      "fundingTransferSubmitted",
      "fundingTransferExecuted",
      "treasuryFundsMoved",
      "globalTreasuryFundingApproved",
      "globalTreasuryFundingExecuted",
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
  schema: "astra-dex-liquidity-funding-transfer-payload-generation-approval-validation-v0.1",
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
