import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const reviewRelativePath = "reports/dex-pool-creation-safe-payload-verification/dex-pool-creation-safe-payload-verification-review.json";
const payloadRelativePath = "reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json";

const requiredFiles = [
  "configs/dex-pool-creation-safe-payload-verification.config.json",
  "docs/dex-pool-creation-safe-payload-verification/DEX_POOL_CREATION_SAFE_PAYLOAD_VERIFICATION_REVIEW.md",
  "docs/dex-pool-creation-safe-payload-verification/DEX_POOL_CREATION_SAFE_PAYLOAD_VERIFICATION_CHECKLIST.md",
  "docs/dex-pool-creation-safe-payload-verification/DEX_POOL_CREATION_SAFE_PAYLOAD_VERIFICATION_BOUNDARIES.md",
  "docs/dex-pool-creation-safe-payload-verification/DEX_POOL_CREATION_SAFE_PAYLOAD_VERIFICATION_RUNBOOK.md",
  "scripts/verify-dex-pool-creation-safe-payload.mjs",
  reviewRelativePath,
  payloadRelativePath,
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
    issue(file, "Missing required Safe payload verification file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden execution/live artifact exists. Verification must not execute or create pool.");
  }
}

if (issues.length === 0) {
  const review = readJson(reviewRelativePath);
  const payload = readJson(payloadRelativePath);
  const generationStatus = readJson("public-docs/dex-pool-creation-safe-payload-generation-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (review.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_VERIFICATION_REVIEW_COMPLETE_NOT_EXECUTED") {
    issue("review.status", `Unexpected review status: ${review.status}`);
  }

  for (const key of [
    "payloadHashVerified",
    "selectorVerified",
    "functionSignatureVerified",
    "targetVerified",
    "safeAddressVerified",
    "token0Verified",
    "token1Verified",
    "feeVerified",
    "sqrtPriceX96Verified",
    "localOnly"
  ]) {
    const value = key === "payloadHashVerified" ? review[key] : review.verification?.[key];

    if (value !== true) {
      issue(`review.${key}`, `${key} must be true.`);
    }
  }

  for (const key of [
    "submittedToSafe",
    "safeTransactionExecuted",
    "poolCreated",
    "liquidityAdded",
    "fundsMoved"
  ]) {
    if (review.verification?.[key] !== false) {
      issue(`review.verification.${key}`, `${key} must remain false.`);
    }
  }

  if (payload.flags?.safeTransactionSubmitted !== false || payload.flags?.safeTransactionExecuted !== false) {
    issue("payload.flags", "Payload must remain not submitted and not executed.");
  }

  if (payload.flags?.poolCreated !== false || payload.flags?.liquidityAdded !== false || payload.flags?.fundsMoved !== false) {
    issue("payload.flags", "Payload must not indicate pool creation, liquidity, or funds movement.");
  }

  if (generationStatus.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATED_NOT_EXECUTED") {
    issue("generationStatus.status", "Safe payload generation status must be generated/not executed.");
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
}

const result = {
  schema: "astra-dex-pool-creation-safe-payload-verification-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  reviewFile: reviewRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
