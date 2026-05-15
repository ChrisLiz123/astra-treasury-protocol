import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const reportDir = path.join(root, "reports", "dex-pool-creation-post-execution-verification");
const reportFile = path.join(reportDir, "dex-pool-creation-post-execution-verification.json");

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

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value, null, 2) + "\n").digest("hex");
}

function readRuntimeEnvValue(key) {
  const runtimeFile = path.join(root, ".runtime", "mainnet-monitor.env");

  if (!fs.existsSync(runtimeFile)) return "";

  const lines = fs.readFileSync(runtimeFile, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [rawKey, ...rest] = trimmed.split("=");

    if (rawKey.trim() === key) {
      return rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }

  return "";
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

function zeroAddress() {
  return "0x0000000000000000000000000000000000000000";
}

function isNonEmptyCode(value) {
  return typeof value === "string" && value !== "0x" && value.length > 2;
}

function encodeAddress(value) {
  return normalizeAddress(value).replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

function encodeUint24(value) {
  return BigInt(value).toString(16).padStart(64, "0");
}

function decodeAddressFromWord(value) {
  const clean = String(value || "").replace(/^0x/i, "").padStart(64, "0");
  return `0x${clean.slice(-40)}`;
}

function decodeUint(value) {
  const clean = String(value || "").replace(/^0x/i, "").padStart(64, "0");
  return BigInt(`0x${clean}`);
}

function decodeSlot0(result) {
  const clean = String(result || "").replace(/^0x/i, "");

  if (clean.length < 64 * 7) {
    throw new Error(`slot0 returned too little data: ${result}`);
  }

  const words = clean.match(/.{64}/g) || [];

  return {
    sqrtPriceX96: BigInt(`0x${words[0]}`).toString(),
    tickRaw: words[1],
    observationIndex: BigInt(`0x${words[2]}`).toString(),
    observationCardinality: BigInt(`0x${words[3]}`).toString(),
    observationCardinalityNext: BigInt(`0x${words[4]}`).toString(),
    feeProtocol: BigInt(`0x${words[5]}`).toString(),
    unlocked: BigInt(`0x${words[6]}`) !== 0n
  };
}

async function rpcCall(rpcUrl, method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params
    })
  });

  if (!response.ok) {
    throw new Error(`RPC HTTP ${response.status}`);
  }

  const body = await response.json();

  if (body.error) {
    throw new Error(body.error.message || JSON.stringify(body.error));
  }

  return body.result;
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

async function main() {
  fs.mkdirSync(reportDir, { recursive: true });

  const config = readJson("configs/dex-pool-creation-post-execution-verification.config.json");
  const executionLive = readJson("public-docs/dex-pool-creation-safe-execution-live-status.json");
  const executionRecord = readJson("reports/dex-pool-creation-safe-execution-live/dex-pool-creation-safe-execution-live-record.json");
  const poolRecord = readJson("reports/dex-pool-creation/live/dex-pool-created.json");
  const payload = readJson("reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json");
  const factoryRouter = readJson("reports/dex-pool-creation-factory-router-review/dex-pool-creation-factory-router-review.json");
  const sqrtReview = readJson("reports/dex-pool-creation-token-ordering-sqrtprice/dex-pool-creation-token-ordering-sqrtprice-review.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");
  const monitor = readJson("public-docs/mainnet-monitor-status.json");
  const alerts = readJson("public-docs/mainnet-alerts-status.json");
  const incidents = readJson("public-docs/incident-summary.json");

  if (config.verificationPrepared !== true || config.verificationOnly !== true) {
    issue("config", "Post-execution pool verification must be prepared and verification-only.");
  }

  requireStatus("executionLive.status", executionLive.status, "DEX_POOL_CREATION_SAFE_EXECUTION_LIVE_RECORDED_POOL_CREATED_NO_LIQUIDITY");

  if (executionLive.summary?.poolCreated !== true || executionLive.summary?.safeTransactionExecuted !== true) {
    issue("executionLive.summary", "Execution live status must show Safe executed and pool created.");
  }

  if (executionLive.summary?.liquidityAdded !== false || executionLive.summary?.fundsMoved !== false || executionLive.summary?.publicTradingApproved !== false) {
    issue("executionLive.summary", "Execution live must show no liquidity, no funds moved, and no public trading.");
  }

  if (poolRecord.status !== "DEX_POOL_CREATED_BY_SAFE_EXECUTION_NO_LIQUIDITY") {
    issue("poolRecord.status", "Pool-created evidence must show created by Safe execution with no liquidity.");
  }

  if (!isAddress(poolRecord.poolAddress) || sameAddress(poolRecord.poolAddress, zeroAddress())) {
    issue("poolRecord.poolAddress", "Pool address must be non-zero.");
  }

  if (!sameAddress(poolRecord.poolAddress, executionRecord.poolAddress)) {
    issue("poolRecord.poolAddress", "Pool record address must match execution record.");
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

  if (monitor.status !== "PASS") {
    issue("monitor.status", `Expected PASS, got ${monitor.status}.`);
  }

  if (alerts.responseRequired === true) {
    issue("alerts.responseRequired", "Alerts must not require response.");
  }

  if (Number(incidents?.summary?.active || 0) !== 0) {
    issue("incidents.summary.active", "Active incidents must be zero.");
  }

  const rpcUrl =
    process.env.DEX_POST_EXECUTION_RPC_URL ||
    process.env.DEX_SAFE_EXECUTION_RPC_URL ||
    process.env.DEX_POOL_PRECHECK_RPC_URL ||
    process.env.MAINNET_MONITOR_RPC_URL ||
    readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

  if (!String(rpcUrl || "").startsWith("https://")) {
    issue("DEX_POST_EXECUTION_RPC_URL", "RPC URL must be available and start with https://.");
  }

  const token0 = payload.transaction?.parameters?.token0 || "";
  const token1 = payload.transaction?.parameters?.token1 || "";
  const fee = payload.transaction?.parameters?.fee || "";
  const reviewedSqrtPriceX96 = String(payload.transaction?.parameters?.sqrtPriceX96 || sqrtReview.sqrtPriceX96Review?.sqrtPriceX96 || "");
  const factoryAddress = factoryRouter.rpcChecks?.nfpmFactoryAddress || "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
  const recordedPoolAddress = poolRecord.poolAddress;

  let factoryGetPoolAddress = "";
  let poolCodePresent = false;
  let poolToken0 = "";
  let poolToken1 = "";
  let poolFee = "";
  let poolLiquidity = "0";
  let slot0 = {};
  let slot0Initialized = false;
  let slot0SqrtMatchesReviewed = false;

  if (issues.length === 0) {
    try {
      const getPoolSelector = "0x1698ee82";
      const getPoolCalldata =
        getPoolSelector +
        encodeAddress(token0) +
        encodeAddress(token1) +
        encodeUint24(fee);

      const getPoolResult = await rpcCall(rpcUrl, "eth_call", [
        {
          to: factoryAddress,
          data: getPoolCalldata
        },
        "latest"
      ]);

      factoryGetPoolAddress = decodeAddressFromWord(getPoolResult);

      if (!sameAddress(factoryGetPoolAddress, recordedPoolAddress)) {
        issue("factory.getPool", `Factory getPool ${factoryGetPoolAddress} does not match recorded pool ${recordedPoolAddress}.`);
      }

      const poolCode = await rpcCall(rpcUrl, "eth_getCode", [recordedPoolAddress, "latest"]);
      poolCodePresent = isNonEmptyCode(poolCode);

      if (!poolCodePresent) {
        issue("pool.code", "Recorded pool address does not have contract code.");
      }

      poolToken0 = decodeAddressFromWord(await rpcCall(rpcUrl, "eth_call", [
        { to: recordedPoolAddress, data: "0x0dfe1681" },
        "latest"
      ]));

      poolToken1 = decodeAddressFromWord(await rpcCall(rpcUrl, "eth_call", [
        { to: recordedPoolAddress, data: "0xd21220a7" },
        "latest"
      ]));

      poolFee = decodeUint(await rpcCall(rpcUrl, "eth_call", [
        { to: recordedPoolAddress, data: "0xddca3f43" },
        "latest"
      ])).toString();

      poolLiquidity = decodeUint(await rpcCall(rpcUrl, "eth_call", [
        { to: recordedPoolAddress, data: "0x1a686502" },
        "latest"
      ])).toString();

      slot0 = decodeSlot0(await rpcCall(rpcUrl, "eth_call", [
        { to: recordedPoolAddress, data: "0x3850c7bd" },
        "latest"
      ]));

      slot0Initialized = BigInt(slot0.sqrtPriceX96 || "0") > 0n;
      slot0SqrtMatchesReviewed = String(slot0.sqrtPriceX96) === String(reviewedSqrtPriceX96);

      if (!sameAddress(poolToken0, token0)) {
        issue("pool.token0", `Pool token0 ${poolToken0} does not match payload token0 ${token0}.`);
      }

      if (!sameAddress(poolToken1, token1)) {
        issue("pool.token1", `Pool token1 ${poolToken1} does not match payload token1 ${token1}.`);
      }

      if (String(poolFee) !== String(fee)) {
        issue("pool.fee", `Pool fee ${poolFee} does not match payload fee ${fee}.`);
      }

      if (!slot0Initialized) {
        issue("pool.slot0", "Pool slot0 sqrtPriceX96 is not initialized.");
      }

      if (!slot0SqrtMatchesReviewed) {
        issue("pool.slot0.sqrtPriceX96", "Pool slot0 sqrtPriceX96 does not match reviewed/payload sqrtPriceX96.");
      }

      if (String(poolLiquidity) !== "0") {
        issue("pool.liquidity", `Expected zero liquidity after pool creation, got ${poolLiquidity}.`);
      }
    } catch (error) {
      issue("postExecutionVerification", error.message);
    }
  }

  const status = issues.length === 0
    ? "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING"
    : "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFICATION_REQUIRED";

  const report = {
    schema: "astra-dex-pool-creation-post-execution-verification-v0.1",
    generatedAt: new Date().toISOString(),
    status,
    currentApprovedMode: "restricted-mainnet-operation",
    selectedPublicPurchasePath: "dex-liquidity-pool-trading",
    verificationOnly: true,
    poolVerification: {
      recordedPoolAddress,
      factoryAddress,
      factoryGetPoolAddress,
      factoryGetPoolMatchesRecorded: sameAddress(factoryGetPoolAddress, recordedPoolAddress),
      poolCodePresent,
      poolToken0,
      expectedToken0: token0,
      token0Verified: sameAddress(poolToken0, token0),
      poolToken1,
      expectedToken1: token1,
      token1Verified: sameAddress(poolToken1, token1),
      poolFee,
      expectedFee: String(fee),
      feeVerified: String(poolFee) === String(fee),
      poolLiquidity,
      liquidityVerifiedZero: String(poolLiquidity) === "0",
      slot0,
      slot0Initialized,
      slot0SqrtMatchesReviewed,
      reviewedSqrtPriceX96
    },
    executionEvidence: {
      safeTxHash: executionRecord.safeTxHash,
      executionTxHash: executionRecord.executionTxHash,
      safeAddress: executionRecord.safeAddress,
      payloadHash: executionRecord.payloadHash,
      safeTransactionExecuted: true,
      poolCreated: true
    },
    requiredBeforeLiquidityProvisionApproval: {
      postExecutionPoolVerified: issues.length === 0,
      poolAddressVerified: sameAddress(factoryGetPoolAddress, recordedPoolAddress),
      poolLiquidityVerifiedZero: String(poolLiquidity) === "0",
      postExecutionMonitoringComplete: issues.length === 0,
      liquidityProvisionApprovalRecorded: false,
      treasuryFundingApprovalRecorded: false,
      publicStatusUpdatePrepared: false
    },
    flags: {
      poolCreated: true,
      poolVerified: issues.length === 0,
      liquidityProvisionApproved: false,
      liquidityAdded: false,
      fundsMoved: false,
      publicTradingApproved: false,
      publicTradingLinkApproved: false,
      buyPageActivated: false,
      treasuryFundingApproved: false,
      fullLaunchApproved: false
    },
    safety: {
      readOnlyRpcOnly: true,
      addsLiquidity: false,
      movesTreasuryFunds: false,
      activatesBuyPage: false,
      approvesPublicTrading: false,
      approvesFullLaunch: false
    },
    issues
  };

  report.verificationHash = sha256Json(report);

  writeJson(reportFile, report);

  console.log(JSON.stringify({
    schema: "astra-dex-pool-creation-post-execution-verification-result-v0.1",
    checkedAt: report.generatedAt,
    status,
    poolAddress: recordedPoolAddress,
    factoryGetPoolAddress,
    poolCodePresent,
    token0Verified: report.poolVerification.token0Verified,
    token1Verified: report.poolVerification.token1Verified,
    feeVerified: report.poolVerification.feeVerified,
    slot0Initialized,
    slot0SqrtMatchesReviewed,
    poolLiquidity,
    liquidityAdded: false,
    fundsMoved: false,
    publicTradingApproved: false,
    fullLaunchApproved: false,
    issues
  }, null, 2));

  if (issues.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
