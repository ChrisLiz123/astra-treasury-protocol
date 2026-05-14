import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const confirm = process.env.DEX_SAFE_SUBMISSION_APPROVAL_CONFIRM || "";
const approver = process.env.DEX_SAFE_SUBMISSION_APPROVER || "";
const approvalReference = process.env.DEX_SAFE_SUBMISSION_APPROVAL_REFERENCE || "";
const overwrite = process.env.OVERWRITE_DEX_SAFE_SUBMISSION_APPROVAL || "";

const requiredConfirm = "APPROVE_DEX_SAFE_SUBMISSION_ONLY";

const recordDir = path.join(root, "reports", "dex-pool-creation-safe-submission-approval");
const recordFile = path.join(recordDir, "dex-pool-creation-safe-submission-approval-record.json");
const configFile = path.join(root, "configs", "dex-pool-creation-safe-submission-approval.config.json");
const payloadFile = path.join(root, "reports", "dex-pool-creation-safe-payload-generation", "generated", "dex-pool-creation-safe-payload.json");

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
  issue("DEX_SAFE_SUBMISSION_APPROVAL_CONFIRM", `Must equal ${requiredConfirm}.`);
}

requireUsable("DEX_SAFE_SUBMISSION_APPROVER", approver);
requireUsable("DEX_SAFE_SUBMISSION_APPROVAL_REFERENCE", approvalReference);

if (fs.existsSync(recordFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_DEX_SAFE_SUBMISSION_APPROVAL",
    "Approval record already exists. Set OVERWRITE_DEX_SAFE_SUBMISSION_APPROVAL=YES only if replacing intentionally."
  );
}

if (!fs.existsSync(payloadFile)) {
  issue("payloadFile", "Generated Safe payload file is required before Safe submission approval.");
}

const verification = readJson("public-docs/dex-pool-creation-safe-payload-verification-status.json");
const generation = readJson("public-docs/dex-pool-creation-safe-payload-generation-status.json");
const generationApproval = readJson("public-docs/dex-pool-creation-safe-payload-generation-approval-status.json");
const safeOwners = readJson("public-docs/dex-pool-creation-safe-owners-threshold-status.json");
const factoryRouter = readJson("public-docs/dex-pool-creation-factory-router-review-status.json");
const sqrtReview = readJson("public-docs/dex-pool-creation-token-ordering-sqrtprice-status.json");
const precheck = readJson("public-docs/dex-pool-existence-precheck-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const safeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

if (verification.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_VERIFICATION_REVIEW_COMPLETE_NOT_EXECUTED") {
  issue("verification.status", "Safe payload verification review must be complete.");
}

if (generation.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATED_NOT_EXECUTED") {
  issue("generation.status", "Safe payload must be generated but not executed.");
}

if (generationApproval.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_GENERATED") {
  issue("generationApproval.status", "Safe payload generation approval must be recorded.");
}

if (safeOwners.status !== "DEX_POOL_CREATION_SAFE_OWNERS_THRESHOLD_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED") {
  issue("safeOwners.status", "Safe owners and threshold review must be complete.");
}

if (factoryRouter.status !== "DEX_POOL_CREATION_FACTORY_ROUTER_EXECUTION_PATH_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED") {
  issue("factoryRouter.status", "Factory/router review must be complete.");
}

if (sqrtReview.status !== "DEX_POOL_CREATION_TOKEN_ORDERING_SQRTPRICEX96_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED") {
  issue("sqrtReview.status", "Token ordering / sqrtPriceX96 review must be complete.");
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
    issue(file, "Forbidden submission/execution/live artifact exists. Approval must not submit, execute, or create a pool.");
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-pool-creation-safe-submission-approval-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_SAFE_SUBMISSION_NOT_APPROVED",
    issues
  }, null, 2));
  process.exit(1);
}

const payload = readJsonPath(payloadFile);

if (payload.flags?.safeTransactionSubmitted !== false || payload.flags?.safeTransactionExecuted !== false) {
  issue("payload.flags", "Payload must remain not submitted and not executed.");
}

if (payload.flags?.poolCreated !== false || payload.flags?.liquidityAdded !== false || payload.flags?.fundsMoved !== false) {
  issue("payload.flags", "Payload must not indicate pool creation, liquidity, or funds movement.");
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-pool-creation-safe-submission-approval-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_SAFE_SUBMISSION_NOT_APPROVED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const now = new Date().toISOString();

const record = {
  schema: "astra-dex-pool-creation-safe-submission-approval-record-v0.1",
  recordedAt: now,
  status: "DEX_POOL_CREATION_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED",
  approvalScope: "safe-submission-only-no-execution",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  approver,
  approvalReference,
  payloadVerificationReference: "public-docs/dex-pool-creation-safe-payload-verification-status.json",
  payloadGenerationReference: "public-docs/dex-pool-creation-safe-payload-generation-status.json",
  freshNoPoolRecheckReference: "public-docs/dex-pool-existence-precheck-status.json",
  payloadFile: "reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json",
  payloadHash: payload.payloadHash || "",
  safeAddress: payload.safeAddress || "",
  targetAddress: payload.transaction?.to || "",
  functionSignature: payload.transaction?.functionSignature || "",
  safeSubmissionApprovalRecorded: true,
  safeSubmissionApproved: true,
  safeTransactionSubmitted: false,
  safeTransactionQueued: false,
  safeTransactionPrepared: false,
  safeTransactionExecutionApproved: false,
  safeTransactionExecuted: false,
  poolCreationExecutionApproved: false,
  poolCreated: false,
  liquidityProvisionApproved: false,
  liquidityAdded: false,
  publicTradingApproved: false,
  publicTradingLinkApproved: false,
  buyPageActivated: false,
  treasuryFundingApproved: false,
  treasuryFundsMoved: false,
  fullLaunchApproved: false,
  safety: {
    sendsTransactions: false,
    movesFunds: false,
    createsLiquidityPool: false,
    addsLiquidity: false,
    enablesPublicTrading: false,
    submitsToSafe: false,
    queuesSafeTransaction: false,
    executesSafeTransaction: false,
    activatesBuyPage: false,
    approvesFullLaunch: false
  }
};

writeJson(recordFile, record);

const config = readJsonPath(configFile);

config.status = "safe-submission-approved-not-submitted";
config.safeSubmissionApprovalRecorded = true;
config.safeSubmissionApproved = true;
config.safeTransactionSubmitted = false;
config.safeTransactionQueued = false;
config.safeTransactionPrepared = false;
config.safeTransactionExecutionApproved = false;
config.safeTransactionExecuted = false;
config.poolCreationExecutionApproved = false;
config.poolCreated = false;
config.liquidityProvisionApproved = false;
config.liquidityAdded = false;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.buyPageActivationApproved = false;
config.treasuryFundingApproved = false;
config.treasuryFundsMoved = false;
config.fullLaunchApproved = false;
config.approvedSafeSubmission = {
  recordedAt: now,
  approver,
  approvalReference,
  recordFile: "reports/dex-pool-creation-safe-submission-approval/dex-pool-creation-safe-submission-approval-record.json",
  payloadHash: payload.payloadHash || "",
  safeAddress: payload.safeAddress || ""
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-pool-creation-safe-submission-approval-result-v0.1",
  checkedAt: now,
  status: "DEX_POOL_CREATION_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED",
  recordFile,
  payloadHash: payload.payloadHash || "",
  safeAddress: payload.safeAddress || "",
  safeTransactionSubmitted: false,
  safeTransactionExecuted: false,
  poolCreated: false,
  liquidityAdded: false,
  movesFunds: false,
  approvesPublicTrading: false,
  approvesFullLaunch: false
}, null, 2));
