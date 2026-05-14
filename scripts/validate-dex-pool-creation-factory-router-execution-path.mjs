import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const reviewRelativePath = "reports/dex-pool-creation-factory-router-review/dex-pool-creation-factory-router-review.json";
const reviewPath = path.join(root, reviewRelativePath);

const requiredFiles = [
  "configs/dex-pool-creation-factory-router-review.config.json",
  "docs/dex-pool-creation-factory-router-review/DEX_POOL_CREATION_FACTORY_ROUTER_EXECUTION_PATH_REVIEW.md",
  "docs/dex-pool-creation-factory-router-review/DEX_FACTORY_ROUTER_REVIEW_CHECKLIST.md",
  "docs/dex-pool-creation-factory-router-review/DEX_FACTORY_ROUTER_BOUNDARIES.md",
  "docs/dex-pool-creation-factory-router-review/DEX_FACTORY_ROUTER_REVIEW_RUNBOOK.md",
  "scripts/review-dex-pool-creation-factory-router-execution-path.mjs",
  reviewRelativePath,
  "public-docs/dex-pool-creation-token-ordering-sqrtprice-status.json",
  "public-docs/dex-pool-creation-safe-payload-draft-review-status.json",
  "public-docs/dex-pool-creation-safe-payload-draft-status.json",
  "public-docs/dex-pool-creation-safe-payload-preparation-status.json",
  "public-docs/dex-pool-creation-execution-precheck-status.json",
  "public-docs/dex-pool-creation-approval-status.json",
  "public-docs/dex-pool-existence-precheck-status.json",
  "public-docs/dex-pool-creation-readiness-status.json",
  "public-docs/dex-liquidity-source-safe-impact-status.json",
  "public-docs/dex-liquidity-parameter-approval-status.json",
  "public-docs/dex-liquidity-parameter-selection-status.json",
  "public-docs/restricted-mode-final-release-status.json",
  "public-docs/governance-decision-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/treasury-safe-transaction-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-alerts-status.json",
  "public-docs/incident-summary.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
  "reports/dex-pool-creation/live/dex-pool-created.json",
  "reports/dex-pool-creation/live/pool-created.json",
  "reports/dex-pool-creation/payload/safe-payload.json",
  "reports/dex-pool-creation/payload/transaction.json",
  "reports/dex-pool-creation/payload/safe-transaction.json",
  "reports/dex-pool-creation/direct/direct-execution-submitted.json",
  "public-docs/dex-pool-created-status.json",
  "public-docs/dex-pool-creation-safe-payload-generated-status.json"
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

function scanForExecutablePayload(value, currentPath = "review") {
  if (value === null || value === undefined) return;

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^0x[0-9a-fA-F]{64,}$/.test(trimmed)) {
      issue(currentPath, "Factory/router review appears to contain encoded calldata or executable transaction data.");
    }

    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForExecutablePayload(item, `${currentPath}[${index}]`));
    return;
  }

  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase();

      if (["data", "calldata", "txdata", "safetxdata", "transactiondata", "encodedcalldata"].includes(normalizedKey)) {
        issue(`${currentPath}.${key}`, "Executable payload/data fields are forbidden in factory/router review.");
      }

      scanForExecutablePayload(child, `${currentPath}.${key}`);
    }
  }
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required DEX factory/router execution path review file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden pool/payload/execution artifact exists. Review must not generate payloads or execute.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-pool-creation-factory-router-review.config.json");
  const review = readJson(reviewRelativePath);
  const sqrtReviewPublic = readJson("public-docs/dex-pool-creation-token-ordering-sqrtprice-status.json");
  const draftReview = readJson("public-docs/dex-pool-creation-safe-payload-draft-review-status.json");
  const draftStatus = readJson("public-docs/dex-pool-creation-safe-payload-draft-status.json");
  const preparation = readJson("public-docs/dex-pool-creation-safe-payload-preparation-status.json");
  const executionPrecheck = readJson("public-docs/dex-pool-creation-execution-precheck-status.json");
  const poolCreationApproval = readJson("public-docs/dex-pool-creation-approval-status.json");
  const precheck = readJson("public-docs/dex-pool-existence-precheck-status.json");
  const readiness = readJson("public-docs/dex-pool-creation-readiness-status.json");
  const sourceSafeImpact = readJson("public-docs/dex-liquidity-source-safe-impact-status.json");
  const parameterApproval = readJson("public-docs/dex-liquidity-parameter-approval-status.json");
  const parameterSelection = readJson("public-docs/dex-liquidity-parameter-selection-status.json");
  const finalRelease = readJson("public-docs/restricted-mode-final-release-status.json");
  const governanceDecision = readJson("public-docs/governance-decision-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const safeTx = readJson("public-docs/treasury-safe-transaction-status.json");
  const monitor = readJson("public-docs/mainnet-monitor-status.json");
  const alerts = readJson("public-docs/mainnet-alerts-status.json");
  const incidents = readJson("public-docs/incident-summary.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.reviewPrepared !== true || config.reviewOnly !== true) {
    issue("config", "Factory/router execution path review must be prepared and review-only.");
  }

  if (review.status !== "DEX_POOL_CREATION_FACTORY_ROUTER_EXECUTION_PATH_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED") {
    issue("review.status", `Unexpected factory/router review status: ${review.status}`);
  }

  if (!isAddress(review.intendedExecutionPath?.targetAddress)) {
    issue("review.intendedExecutionPath.targetAddress", "Target address must be valid.");
  }

  if (review.intendedExecutionPath?.functionSignature !== config.intendedFunctionSignature) {
    issue("review.intendedExecutionPath.functionSignature", "Function signature must match expected pool initializer.");
  }

  if (review.rpcChecks?.nonfungiblePositionManagerCodePresent !== true) {
    issue("review.rpcChecks.nonfungiblePositionManagerCodePresent", "NonfungiblePositionManager code must be present.");
  }

  if (review.rpcChecks?.factoryCodePresent !== true) {
    issue("review.rpcChecks.factoryCodePresent", "Factory code must be present.");
  }

  if (review.rpcChecks?.nfpmFactoryMatchesConfiguredFactory !== true) {
    issue("review.rpcChecks.nfpmFactoryMatchesConfiguredFactory", "NFPM factory() must match configured Uniswap v3 factory.");
  }

  if (review.rpcChecks?.factoryGetPoolCallSucceeded !== true) {
    issue("review.rpcChecks.factoryGetPoolCallSucceeded", "Factory getPool call must succeed.");
  }

  if (review.rpcChecks?.factoryGetPoolFoundPool !== false) {
    issue("review.rpcChecks.factoryGetPoolFoundPool", "Factory/router review must still show no selected pool.");
  }

  if (review.routeReview?.nonfungiblePositionManagerUsedForPoolCreation !== true) {
    issue("review.routeReview.nonfungiblePositionManagerUsedForPoolCreation", "NFPM should be selected for pool creation.");
  }

  if (review.routeReview?.swapRouter02RequiredForPoolCreationOnly !== false) {
    issue("review.routeReview.swapRouter02RequiredForPoolCreationOnly", "SwapRouter should not be required for pool creation only.");
  }

  if (review.routeReview?.erc20TokenApprovalsRequiredForPoolCreationOnly !== false) {
    issue("review.routeReview.erc20TokenApprovalsRequiredForPoolCreationOnly", "ERC20 approvals should not be required for pool creation only.");
  }

  scanForExecutablePayload(review);

  if (sqrtReviewPublic.status !== "DEX_POOL_CREATION_TOKEN_ORDERING_SQRTPRICEX96_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED") {
    issue("sqrtReviewPublic.status", "Token ordering / sqrtPriceX96 review must be complete.");
  }

  if (draftReview.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_DRAFT_REVIEW_READY_FOR_SQRTPRICEX96_REVIEW_NO_PAYLOAD_GENERATED") {
    issue("draftReview.status", "Safe payload draft review must pass.");
  }

  if (draftStatus.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_DRAFT_READY_NO_PAYLOAD_GENERATED") {
    issue("draftStatus.status", "Safe payload draft gate must pass.");
  }

  if (preparation.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_PREPARATION_READY_NO_PAYLOAD_GENERATED") {
    issue("preparation.status", "Safe payload preparation gate must pass.");
  }

  if (executionPrecheck.status !== "DEX_POOL_CREATION_EXECUTION_PRECHECK_READY_FOR_SAFE_PAYLOAD_PREPARATION_NO_POOL_CREATED") {
    issue("executionPrecheck.status", "Execution precheck must route to Safe payload preparation.");
  }

  if (poolCreationApproval.status !== "DEX_POOL_CREATION_APPROVED_NO_POOL_CREATED") {
    issue("poolCreationApproval.status", "Pool creation path approval must be recorded.");
  }

  if (precheck.status !== "DEX_POOL_EXISTENCE_FACTORY_PRECHECK_COMPLETE_NO_POOL_FOUND" || precheck.summary?.poolExists !== false) {
    issue("precheck.status", "Pool existence precheck must show NO_POOL_FOUND.");
  }

  if (readiness.status !== "DEX_POOL_CREATION_READINESS_READY_NO_POOL_CREATED") {
    issue("readiness.status", "Pool creation readiness gate must pass.");
  }

  if (sourceSafeImpact.status !== "DEX_LIQUIDITY_SOURCE_SAFE_IMPACT_APPROVED_NO_FUNDS_NO_SAFE_PAYLOAD") {
    issue("sourceSafeImpact.status", "Source/Safe-impact planning approval must be recorded.");
  }

  if (parameterApproval.status !== "DEX_LIQUIDITY_PARAMETERS_APPROVED_NO_POOL_NO_LIQUIDITY") {
    issue("parameterApproval.status", "DEX parameters must be approved.");
  }

  if (parameterSelection.status !== "DEX_LIQUIDITY_PARAMETER_SELECTION_IMPORTED_NOT_APPROVED" || parameterSelection.summary?.selectionValid !== true) {
    issue("parameterSelection.status", "Valid DEX parameter selection is required.");
  }

  if (finalRelease.status !== "RESTRICTED_MODE_FINAL_RELEASE_READY_DECISION_RECORDED_ALL_DISABLED") {
    issue("finalRelease.status", "Restricted-mode final release must be ready.");
  }

  if (governanceDecision.governanceDecisionRecorded !== true || governanceDecision.fullLaunchApproved !== false) {
    issue("governanceDecision", "Governance decision must be recorded and must not approve full launch.");
  }

  if (capabilityMatrix.allCapabilitiesDisabled !== true || capabilityMatrix.allCapabilityApprovalsFalse !== true) {
    issue("capabilityMatrix", "Capability Matrix must remain all-disabled.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Treasury funding must remain not approved and not executed.");
  }

  if (safeTx.safeTransactionPayloadGenerated !== false || safeTx.safeTransactionPrepared !== false) {
    issue("safeTx", "Existing Safe transaction status must remain not generated/not prepared.");
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

  for (const key of [
    "safePayloadDraftApproved",
    "safePayloadGenerationApproved",
    "safePayloadGenerated",
    "safeTransactionPrepared",
    "safeTransactionExecutionApproved",
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
}

const result = {
  schema: "astra-dex-pool-creation-factory-router-execution-path-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  reviewFile: reviewRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
