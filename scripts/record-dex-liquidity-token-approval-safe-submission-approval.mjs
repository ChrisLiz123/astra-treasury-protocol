import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const confirm = process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVAL_CONFIRM || "";
const approver = process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVER || "";
const approvalReference = process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVAL_REFERENCE || "";
const overwrite = process.env.OVERWRITE_DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVAL || "";

const requiredConfirm = "APPROVE_DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_ONLY_NOT_EXECUTION";

const recordDir = path.join(root, "reports", "dex-liquidity-token-approval-safe-submission-approval");
const recordFile = path.join(recordDir, "dex-liquidity-token-approval-safe-submission-approval-record.json");
const configFile = path.join(root, "configs", "dex-liquidity-token-approval-safe-submission-approval.config.json");

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readJsonPath(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function isPlaceholder(value) {
  const normalized = String(value || "").trim().toLowerCase();

  return (
    normalized.length === 0 ||
    normalized === "tbd" ||
    normalized.includes("tbd") ||
    normalized.includes("todo") ||
    normalized.includes("placeholder") ||
    normalized.includes("replace_with") ||
    normalized.includes("paste_") ||
    normalized === "yyyy-mm-ddthh:mm:ssz"
  );
}

function looksSensitive(value) {
  const normalized = String(value || "").toLowerCase();

  return (
    normalized.includes("private key") ||
    normalized.includes("seed phrase") ||
    normalized.includes("mnemonic") ||
    normalized.includes("password") ||
    normalized.includes("secret")
  );
}

function requireUsable(name, value) {
  if (isPlaceholder(value)) {
    issue(name, "Required value is missing or still a placeholder.");
  }

  if (looksSensitive(value)) {
    issue(name, "Value appears to contain sensitive material.");
  }
}

if (confirm !== requiredConfirm) {
  issue("DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVAL_CONFIRM", `Must equal ${requiredConfirm}.`);
}

requireUsable("DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVER", approver);
requireUsable("DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVAL_REFERENCE", approvalReference);

if (fs.existsSync(recordFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVAL",
    "Approval record already exists. Set OVERWRITE_DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVAL=YES only if replacing intentionally."
  );
}

const verificationStatus = readJson("public-docs/dex-liquidity-token-approval-safe-payload-verification-status.json");
const verification = readJson("reports/dex-liquidity-token-approval-safe-payload-verification/dex-liquidity-token-approval-safe-payload-verification.json");
const payloadStatus = readJson("public-docs/dex-liquidity-token-approval-safe-payload-status.json");
const payload = readJson("reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json");
const approvalStatus = readJson("public-docs/dex-liquidity-token-approval-payload-generation-approval-status.json");
const recheckStatus = readJson("public-docs/dex-liquidity-token-approval-requirements-recheck-status.json");
const postBalances = readJson("public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

if (verificationStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
  issue("verificationStatus.status", "Token approval Safe payload verification must be complete.");
}

if (verificationStatus.summary?.tokenApprovalSafePayloadVerified !== true) {
  issue("verificationStatus.summary.tokenApprovalSafePayloadVerified", "Token approval Safe payload must be verified.");
}

if (verificationStatus.summary?.tokenApprovalPayloadHashVerified !== true || verificationStatus.summary?.transactionBuilderHashVerified !== true || verificationStatus.summary?.approvalCalldataVerified !== true) {
  issue("verificationStatus.summary.hashes", "Payload hash, Transaction Builder hash, and approval calldata must verify.");
}

if (verificationStatus.summary?.tokenApprovalSafeTransactionSubmitted !== false || verificationStatus.summary?.tokenApprovalExecuted !== false || verificationStatus.summary?.liquidityAdded !== false) {
  issue("verificationStatus.summary.flags", "Verification status must show not submitted, no approval execution, and no liquidity.");
}

if (payloadStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
  issue("payloadStatus.status", "Token approval Safe payload must be generated.");
}

if (payload.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
  issue("payload.status", "Payload file must be generated and not submitted.");
}

if (!isAddress(payload.liquiditySafeAddress)) {
  issue("payload.liquiditySafeAddress", "Liquidity Safe address must be valid.");
}

if (!isAddress(payload.approvalSpender)) {
  issue("payload.approvalSpender", "Approval spender must be valid.");
}

if (!payload.payloadHash || payload.payloadHash !== verificationStatus.summary?.payloadHash) {
  issue("payload.payloadHash", "Payload hash must match verified public status.");
}

if (!Array.isArray(payload.transactions) || payload.transactions.length <= 0) {
  issue("payload.transactions", "Token approval payload transactions must be present.");
}

if (!Array.isArray(verification.transactionChecks) || verification.transactionChecks.length <= 0) {
  issue("verification.transactionChecks", "Verification transaction checks must be present.");
}

for (const check of verification.transactionChecks || []) {
  if (
    check.approvalSpenderMatches !== true ||
    check.amountMatchesCalldata !== true ||
    check.outerToIsToken !== true ||
    check.transactionBuilderMatchesPayload !== true ||
    check.dataHashVerified !== true ||
    check.allowanceStillUnexecuted !== true
  ) {
    issue(`verification.transactionChecks.${check.id}`, "All token approval payload verification checks must pass.");
  }
}

if (approvalStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_NO_APPROVALS_EXECUTED") {
  issue("approvalStatus.status", "Token approval payload generation approval must be recorded.");
}

if (recheckStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK_COMPLETE_APPROVALS_REQUIRED_NO_APPROVALS_EXECUTED") {
  issue("recheckStatus.status", "Token approval requirements recheck must show approvals required.");
}

if (postBalances.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_VERIFIED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
  issue("postBalances.status", "Post-execution balances must be verified.");
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
  "reports/dex-liquidity-token-approval-safe-submission-live/dex-liquidity-token-approval-safe-submission-live-record.json",
  "reports/dex-liquidity-token-approval/live/token-approval-executed.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden submission-live/token-approval-executed/liquidity/public-trading artifact exists. Approval milestone must not submit or execute approvals.");
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-token-approval-safe-submission-approval-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_NOT_APPROVED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const recordedAt = new Date().toISOString();

const record = {
  schema: "astra-dex-liquidity-token-approval-safe-submission-approval-record-v0.1",
  recordedAt,
  status: "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY",
  approvalScope: "token-approval-safe-submission-only-not-execution-no-liquidity",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  approver,
  approvalReference,
  liquiditySafeAddress: payload.liquiditySafeAddress,
  approvalSpender: payload.approvalSpender,
  payloadHash: payload.payloadHash,
  transactionBuilderHash: verification.transactionBuilderHash,
  transactionCount: payload.transactionCount,
  tokenApprovalSafePayloadVerificationReference: "public-docs/dex-liquidity-token-approval-safe-payload-verification-status.json",
  tokenApprovalSafePayloadReference: "public-docs/dex-liquidity-token-approval-safe-payload-status.json",
  tokenApprovalPayloadReference: "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json",
  tokenApprovalTransactionBuilderReference: "reports/dex-liquidity-token-approval/payload/token-approval-safe-transaction-builder.json",
  tokenApprovalSafeSubmissionApprovalRecorded: true,
  tokenApprovalSafeSubmissionApproved: true,
  tokenApprovalSafePayloadVerified: true,
  tokenApprovalSafePayloadGenerated: true,
  tokenApprovalTransactionBuilderGenerated: true,
  tokenApprovalSafeTransactionSubmitted: false,
  tokenApprovalSafeTransactionExecuted: false,
  tokenApprovalExecuted: false,
  liquidityMintCalldataGenerated: false,
  liquiditySafePayloadGenerated: false,
  liquiditySafeTransactionSubmitted: false,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  publicTradingLinkApproved: false,
  buyPageActivated: false,
  fullLaunchApproved: false,
  requiredBeforeTokenApprovalSafeSubmissionPreparation: {
    tokenApprovalSafeSubmissionApprovalRecorded: true,
    tokenApprovalSafePayloadVerified: true,
    tokenApprovalPayloadHashVerified: true,
    transactionBuilderHashVerified: true,
    approvalCalldataVerified: true,
    tokenApprovalSafeTransactionSubmitted: false,
    tokenApprovalExecuted: false,
    operatorSubmissionCommandReviewed: false,
    safeSubmissionPreparationComplete: false,
    safeSubmissionDryRunComplete: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    approvalOnly: true,
    submitsSafeTransaction: false,
    executesTokenApproval: false,
    generatesLiquidityCalldata: false,
    addsLiquidity: false,
    mintsPosition: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

writeJson(recordFile, record);

const config = readJsonPath(configFile);

config.status = "token-approval-safe-submission-approved-not-submitted-no-approvals-executed-no-liquidity";
config.tokenApprovalSafeSubmissionApprovalRecorded = true;
config.tokenApprovalSafeSubmissionApproved = true;
config.tokenApprovalSafePayloadVerified = true;
config.tokenApprovalSafePayloadGenerated = true;
config.tokenApprovalTransactionBuilderGenerated = true;
config.tokenApprovalSafeTransactionSubmitted = false;
config.tokenApprovalSafeTransactionExecuted = false;
config.tokenApprovalExecuted = false;
config.liquidityMintCalldataGenerated = false;
config.liquiditySafePayloadGenerated = false;
config.liquiditySafeTransactionSubmitted = false;
config.liquiditySafeTransactionExecuted = false;
config.liquidityAdded = false;
config.positionMinted = false;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.buyPageActivationApproved = false;
config.fullLaunchApproved = false;
config.approvedTokenApprovalSafeSubmission = {
  recordedAt,
  approver,
  approvalReference,
  liquiditySafeAddress: record.liquiditySafeAddress,
  approvalSpender: record.approvalSpender,
  payloadHash: record.payloadHash,
  transactionBuilderHash: record.transactionBuilderHash,
  transactionCount: record.transactionCount,
  recordFile: "reports/dex-liquidity-token-approval-safe-submission-approval/dex-liquidity-token-approval-safe-submission-approval-record.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-token-approval-safe-submission-approval-result-v0.1",
  checkedAt: recordedAt,
  status: record.status,
  liquiditySafeAddress: record.liquiditySafeAddress,
  approvalSpender: record.approvalSpender,
  payloadHash: record.payloadHash,
  transactionCount: record.transactionCount,
  tokenApprovalSafeSubmissionApproved: true,
  tokenApprovalSafeTransactionSubmitted: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
