import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const reportDir = path.join(root, "reports", "dex-pool-creation-safe-payload-verification");
const reportFile = path.join(reportDir, "dex-pool-creation-safe-payload-verification-review.json");

const payloadRelativePath = "reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json";

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function normalizeAddress(value) {
  return String(value || "").trim();
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function sameAddress(a, b) {
  return normalizeAddress(a).toLowerCase() === normalizeAddress(b).toLowerCase();
}

function sha256JsonWithoutPayloadHash(value) {
  const copy = JSON.parse(JSON.stringify(value));
  delete copy.payloadHash;

  return crypto.createHash("sha256").update(JSON.stringify(copy, null, 2) + "\n").digest("hex");
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value, null, 2) + "\n").digest("hex");
}

function decodeAddressWord(word) {
  return `0x${word.slice(-40)}`;
}

function decodeCalldata(data) {
  const clean = String(data || "").replace(/^0x/i, "");

  if (clean.length !== 264) {
    throw new Error(`Expected 132 bytes / 264 hex chars after 0x, got ${clean.length}.`);
  }

  const selector = `0x${clean.slice(0, 8)}`;
  const words = clean.slice(8).match(/.{64}/g) || [];

  if (words.length !== 4) {
    throw new Error(`Expected 4 ABI words, got ${words.length}.`);
  }

  return {
    selector,
    token0: decodeAddressWord(words[0]),
    token1: decodeAddressWord(words[1]),
    fee: Number(BigInt(`0x${words[2]}`)),
    sqrtPriceX96: BigInt(`0x${words[3]}`).toString()
  };
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

async function main() {
  fs.mkdirSync(reportDir, { recursive: true });

  const payload = readJson(payloadRelativePath);
  const generationStatus = readJson("public-docs/dex-pool-creation-safe-payload-generation-status.json");
  const approval = readJson("public-docs/dex-pool-creation-safe-payload-generation-approval-status.json");
  const safeOwners = readJson("public-docs/dex-pool-creation-safe-owners-threshold-status.json");
  const factoryRouterPublic = readJson("public-docs/dex-pool-creation-factory-router-review-status.json");
  const factoryRouter = readJson("reports/dex-pool-creation-factory-router-review/dex-pool-creation-factory-router-review.json");
  const sqrtPublic = readJson("public-docs/dex-pool-creation-token-ordering-sqrtprice-status.json");
  const sqrtReview = readJson("reports/dex-pool-creation-token-ordering-sqrtprice/dex-pool-creation-token-ordering-sqrtprice-review.json");
  const precheck = readJson("public-docs/dex-pool-existence-precheck-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const safeTx = readJson("public-docs/treasury-safe-transaction-status.json");
  const monitor = readJson("public-docs/mainnet-monitor-status.json");
  const alerts = readJson("public-docs/mainnet-alerts-status.json");
  const incidents = readJson("public-docs/incident-summary.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  requireStatus("generationStatus.status", generationStatus.status, "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATED_NOT_EXECUTED");
  requireStatus("approval.status", approval.status, "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_GENERATED");
  requireStatus("safeOwners.status", safeOwners.status, "DEX_POOL_CREATION_SAFE_OWNERS_THRESHOLD_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED");
  requireStatus("factoryRouter.status", factoryRouterPublic.status, "DEX_POOL_CREATION_FACTORY_ROUTER_EXECUTION_PATH_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED");
  requireStatus("sqrtPrice.status", sqrtPublic.status, "DEX_POOL_CREATION_TOKEN_ORDERING_SQRTPRICEX96_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED");

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

  if (payload.schema !== "astra-dex-pool-creation-safe-payload-v0.1") {
    issue("payload.schema", "Invalid payload schema.");
  }

  if (payload.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATED_NOT_EXECUTED") {
    issue("payload.status", "Unexpected payload status.");
  }

  if (payload.payloadHash !== sha256JsonWithoutPayloadHash(payload)) {
    issue("payload.payloadHash", "Payload hash does not match payload contents.");
  }

  const decoded = decodeCalldata(payload.transaction?.data);

  if (decoded.selector !== "0x13ead562") {
    issue("decoded.selector", `Unexpected selector ${decoded.selector}.`);
  }

  if (payload.transaction?.functionSelector !== "0x13ead562") {
    issue("payload.transaction.functionSelector", "Unexpected function selector.");
  }

  if (payload.transaction?.functionSignature !== "createAndInitializePoolIfNecessary(address,address,uint24,uint160)") {
    issue("payload.transaction.functionSignature", "Unexpected function signature.");
  }

  if (payload.transaction?.value !== "0") {
    issue("payload.transaction.value", "Payload value must be 0.");
  }

  if (payload.transaction?.operation !== "CALL" || payload.transaction?.operationValue !== 0) {
    issue("payload.transaction.operation", "Payload operation must be CALL / 0.");
  }

  const payloadParams = payload.transaction?.parameters || {};
  const reviewedToken0 = sqrtReview.tokenOrderingReview?.token0 || {};
  const reviewedToken1 = sqrtReview.tokenOrderingReview?.token1 || {};
  const reviewedFee = factoryRouter.selectedInputsForLaterPayloadGeneration?.fee;
  const reviewedSqrtPriceX96 = sqrtReview.sqrtPriceX96Review?.sqrtPriceX96 || sqrtPublic.summary?.sqrtPriceX96 || "";
  const reviewedTarget = factoryRouter.intendedExecutionPath?.targetAddress || factoryRouterPublic.summary?.targetAddress || "";
  const reviewedSafe = safeOwners.summary?.safeAddress || "";

  if (!sameAddress(decoded.token0, reviewedToken0.address)) {
    issue("decoded.token0", `Decoded token0 ${decoded.token0} does not match reviewed token0 ${reviewedToken0.address}.`);
  }

  if (!sameAddress(decoded.token1, reviewedToken1.address)) {
    issue("decoded.token1", `Decoded token1 ${decoded.token1} does not match reviewed token1 ${reviewedToken1.address}.`);
  }

  if (decoded.fee !== Number(reviewedFee)) {
    issue("decoded.fee", `Decoded fee ${decoded.fee} does not match reviewed fee ${reviewedFee}.`);
  }

  if (decoded.sqrtPriceX96 !== String(reviewedSqrtPriceX96)) {
    issue("decoded.sqrtPriceX96", "Decoded sqrtPriceX96 does not match reviewed sqrtPriceX96.");
  }

  if (!sameAddress(payloadParams.token0, reviewedToken0.address)) {
    issue("payload.parameters.token0", "Payload token0 parameter does not match reviewed token0.");
  }

  if (!sameAddress(payloadParams.token1, reviewedToken1.address)) {
    issue("payload.parameters.token1", "Payload token1 parameter does not match reviewed token1.");
  }

  if (Number(payloadParams.fee) !== Number(reviewedFee)) {
    issue("payload.parameters.fee", "Payload fee parameter does not match reviewed fee.");
  }

  if (String(payloadParams.sqrtPriceX96) !== String(reviewedSqrtPriceX96)) {
    issue("payload.parameters.sqrtPriceX96", "Payload sqrtPriceX96 parameter does not match reviewed sqrtPriceX96.");
  }

  if (!sameAddress(payload.transaction?.to, reviewedTarget)) {
    issue("payload.transaction.to", "Payload target does not match reviewed factory/router target.");
  }

  if (!sameAddress(payload.safeAddress, reviewedSafe)) {
    issue("payload.safeAddress", "Payload Safe address does not match Safe owners/threshold review.");
  }

  for (const [key, expected] of Object.entries({
    encodedCallDataGenerated: true,
    safePayloadGenerated: true,
    safeTransactionPrepared: false,
    safeTransactionSubmitted: false,
    safeTransactionExecuted: false,
    poolCreated: false,
    liquidityAdded: false,
    fundsMoved: false,
    publicTradingApproved: false,
    buyPageActivated: false,
    fullLaunchApproved: false
  })) {
    if (payload.flags?.[key] !== expected) {
      issue(`payload.flags.${key}`, `Expected ${expected}.`);
    }
  }

  if (payload.safety?.submittedToSafe !== false || payload.safety?.queuedInSafe !== false || payload.safety?.executesSafeTransaction !== false) {
    issue("payload.safety", "Payload must remain unsubmitted, unqueued, and unexecuted.");
  }

  const forbiddenFiles = [
    "reports/dex-pool-creation/live/dex-pool-created.json",
    "reports/dex-pool-creation/live/pool-created.json",
    "reports/dex-pool-creation/direct/direct-execution-submitted.json",
    "public-docs/dex-pool-created-status.json"
  ];

  for (const file of forbiddenFiles) {
    if (fs.existsSync(path.join(root, file))) {
      issue(file, "Forbidden execution/live artifact exists. Verification must not execute or create a pool.");
    }
  }

  const status = issues.length === 0
    ? "DEX_POOL_CREATION_SAFE_PAYLOAD_VERIFICATION_REVIEW_COMPLETE_NOT_EXECUTED"
    : "DEX_POOL_CREATION_SAFE_PAYLOAD_VERIFICATION_REVIEW_REQUIRED";

  const review = {
    schema: "astra-dex-pool-creation-safe-payload-verification-review-v0.1",
    generatedAt: new Date().toISOString(),
    status,
    payloadFile: payloadRelativePath,
    payloadHash: payload.payloadHash || "",
    payloadHashVerified: payload.payloadHash === sha256JsonWithoutPayloadHash(payload),
    decodedCalldata: decoded,
    verification: {
      selectorVerified: decoded.selector === "0x13ead562",
      functionSignatureVerified: payload.transaction?.functionSignature === "createAndInitializePoolIfNecessary(address,address,uint24,uint160)",
      targetVerified: sameAddress(payload.transaction?.to, reviewedTarget),
      safeAddressVerified: sameAddress(payload.safeAddress, reviewedSafe),
      token0Verified: sameAddress(decoded.token0, reviewedToken0.address),
      token1Verified: sameAddress(decoded.token1, reviewedToken1.address),
      feeVerified: decoded.fee === Number(reviewedFee),
      sqrtPriceX96Verified: decoded.sqrtPriceX96 === String(reviewedSqrtPriceX96),
      localOnly: payload.safety?.localFileOnly === true,
      submittedToSafe: false,
      safeTransactionExecuted: false,
      poolCreated: false,
      liquidityAdded: false,
      fundsMoved: false
    },
    reviewedReferences: {
      generationStatus: "public-docs/dex-pool-creation-safe-payload-generation-status.json",
      generationApproval: "public-docs/dex-pool-creation-safe-payload-generation-approval-status.json",
      safeOwnersThreshold: "public-docs/dex-pool-creation-safe-owners-threshold-status.json",
      factoryRouter: "public-docs/dex-pool-creation-factory-router-review-status.json",
      sqrtPriceX96: "public-docs/dex-pool-creation-token-ordering-sqrtprice-status.json",
      freshNoPoolRecheck: "public-docs/dex-pool-existence-precheck-status.json"
    },
    requiredBeforeSafeSubmission: {
      payloadVerificationReviewComplete: true,
      freshNoPoolRecheckImmediatelyBeforeSubmission: false,
      safeSubmissionApprovalRecorded: false,
      safeExecutionApprovalRecorded: false,
      publicStatusUpdatePrepared: false
    },
    issues,
    safety: {
      sendsTransactions: false,
      movesFunds: false,
      createsLiquidityPoolByThisReview: false,
      addsLiquidity: false,
      enablesPublicTrading: false,
      submitsToSafe: false,
      queuesSafeTransaction: false,
      executesSafeTransaction: false,
      activatesBuyPage: false,
      approvesFullLaunch: false
    }
  };

  writeJson(reportFile, review);

  console.log(JSON.stringify({
    schema: "astra-dex-pool-creation-safe-payload-verification-review-result-v0.1",
    checkedAt: review.generatedAt,
    status,
    payloadHashVerified: review.payloadHashVerified,
    selectorVerified: review.verification.selectorVerified,
    targetVerified: review.verification.targetVerified,
    safeAddressVerified: review.verification.safeAddressVerified,
    token0Verified: review.verification.token0Verified,
    token1Verified: review.verification.token1Verified,
    feeVerified: review.verification.feeVerified,
    sqrtPriceX96Verified: review.verification.sqrtPriceX96Verified,
    submittedToSafe: false,
    safeTransactionExecuted: false,
    poolCreated: false,
    liquidityAdded: false,
    fundsMoved: false
  }, null, 2));

  if (issues.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
