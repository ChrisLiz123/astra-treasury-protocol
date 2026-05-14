import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const reportDir = path.join(root, "reports", "dex-pool-creation-factory-router-review");
const reportFile = path.join(reportDir, "dex-pool-creation-factory-router-review.json");

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
  const clean = normalizeAddress(value).replace(/^0x/i, "");
  return clean.padStart(64, "0");
}

function encodeUint24(value) {
  return BigInt(value).toString(16).padStart(64, "0");
}

function decodeAddressFromWord(value) {
  const clean = String(value || "").replace(/^0x/i, "").padStart(64, "0");
  return `0x${clean.slice(-40)}`;
}

function parseFeeTier(rawValue) {
  const raw = String(rawValue || "").trim();
  const compact = raw.toLowerCase().replace(/\s+/g, "");

  if (/\b100\b/.test(raw)) return 100;
  if (/\b500\b/.test(raw)) return 500;
  if (/\b3000\b/.test(raw)) return 3000;
  if (/\b10000\b/.test(raw)) return 10000;

  if (compact.includes("0.01%") || compact.includes("0.01percent")) return 100;
  if (compact.includes("0.05%") || compact.includes("0.05percent")) return 500;
  if (compact.includes("0.3%") || compact.includes("0.30%") || compact.includes("0.3percent") || compact.includes("0.30percent")) return 3000;
  if (compact.includes("1%") || compact.includes("1.0%") || compact.includes("1percent")) return 10000;

  return null;
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

async function main() {
  fs.mkdirSync(reportDir, { recursive: true });

  const config = readJson("configs/dex-pool-creation-factory-router-review.config.json");
  const sqrtReviewPublic = readJson("public-docs/dex-pool-creation-token-ordering-sqrtprice-status.json");
  const sqrtReview = readJson("reports/dex-pool-creation-token-ordering-sqrtprice/dex-pool-creation-token-ordering-sqrtprice-review.json");
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

  if (sqrtReviewPublic.status !== "DEX_POOL_CREATION_TOKEN_ORDERING_SQRTPRICEX96_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED") {
    issue("sqrtReviewPublic.status", "Token ordering / sqrtPriceX96 review must be complete.");
  }

  if (sqrtReview.status !== "DEX_POOL_CREATION_TOKEN_ORDERING_SQRTPRICEX96_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED") {
    issue("sqrtReview.status", "Token ordering / sqrtPriceX96 source report must be complete.");
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

  for (const file of forbiddenFiles) {
    if (fs.existsSync(path.join(root, file))) {
      issue(file, "Forbidden pool/payload/execution artifact exists. Review must not generate payloads or execute.");
    }
  }

  const rpcUrl =
    process.env.DEX_FACTORY_ROUTER_REVIEW_RPC_URL ||
    process.env.DEX_SQRTPRICE_REVIEW_RPC_URL ||
    process.env.DEX_POOL_PRECHECK_RPC_URL ||
    process.env.MAINNET_MONITOR_RPC_URL ||
    readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

  if (!String(rpcUrl || "").startsWith("https://")) {
    issue("DEX_FACTORY_ROUTER_REVIEW_RPC_URL", "RPC URL must be available and start with https://.");
  }

  const contracts = config.uniswapContracts || {};
  const factoryAddress = normalizeAddress(contracts.v3CoreFactory);
  const nonfungiblePositionManager = normalizeAddress(contracts.nonfungiblePositionManager);
  const swapRouter02 = normalizeAddress(contracts.swapRouter02);
  const universalRouter = normalizeAddress(contracts.universalRouter);
  const quoterV2 = normalizeAddress(contracts.quoterV2);

  for (const [name, address] of Object.entries({
    factoryAddress,
    nonfungiblePositionManager,
    swapRouter02,
    universalRouter,
    quoterV2
  })) {
    if (!isAddress(address)) {
      issue(`contracts.${name}`, `${name} is not a valid address.`);
    }
  }

  const token0 = sqrtReview.tokenOrderingReview?.token0 || {};
  const token1 = sqrtReview.tokenOrderingReview?.token1 || {};
  const parsedFeeTier = parseFeeTier(sqrtReview.feeTierOrPoolType || sqrtReviewPublic.summary?.feeTierOrPoolType || "");
  const sqrtPriceX96 = String(sqrtReview.sqrtPriceX96Review?.sqrtPriceX96 || "");

  if (!isAddress(token0.address)) {
    issue("token0.address", "token0 address is invalid.");
  }

  if (!isAddress(token1.address)) {
    issue("token1.address", "token1 address is invalid.");
  }

  if (!parsedFeeTier) {
    issue("feeTier", `Could not parse fee tier from: ${sqrtReview.feeTierOrPoolType}`);
  }

  if (!/^\d+$/.test(sqrtPriceX96) || BigInt(sqrtPriceX96 || "0") <= 0n) {
    issue("sqrtPriceX96", "sqrtPriceX96 must be a positive decimal integer.");
  }

  let rpcChecks = {
    nonfungiblePositionManagerCodePresent: false,
    factoryCodePresent: false,
    swapRouter02CodePresent: false,
    universalRouterCodePresent: false,
    quoterV2CodePresent: false,
    nfpmFactoryAddress: "",
    nfpmFactoryMatchesConfiguredFactory: false,
    factoryGetPoolCallSucceeded: false,
    factoryGetPoolAddress: "",
    factoryGetPoolFoundPool: false
  };

  if (issues.length === 0) {
    try {
      const nfpmCode = await rpcCall(rpcUrl, "eth_getCode", [nonfungiblePositionManager, "latest"]);
      const factoryCode = await rpcCall(rpcUrl, "eth_getCode", [factoryAddress, "latest"]);
      const swapRouterCode = await rpcCall(rpcUrl, "eth_getCode", [swapRouter02, "latest"]);
      const universalRouterCode = await rpcCall(rpcUrl, "eth_getCode", [universalRouter, "latest"]);
      const quoterCode = await rpcCall(rpcUrl, "eth_getCode", [quoterV2, "latest"]);

      rpcChecks.nonfungiblePositionManagerCodePresent = isNonEmptyCode(nfpmCode);
      rpcChecks.factoryCodePresent = isNonEmptyCode(factoryCode);
      rpcChecks.swapRouter02CodePresent = isNonEmptyCode(swapRouterCode);
      rpcChecks.universalRouterCodePresent = isNonEmptyCode(universalRouterCode);
      rpcChecks.quoterV2CodePresent = isNonEmptyCode(quoterCode);

      if (!rpcChecks.nonfungiblePositionManagerCodePresent) {
        issue("nfpmCode", "NonfungiblePositionManager code is not present.");
      }

      if (!rpcChecks.factoryCodePresent) {
        issue("factoryCode", "Uniswap v3 factory code is not present.");
      }

      const factorySelector = "0xc45a0155"; // factory()
      const factoryResult = await rpcCall(rpcUrl, "eth_call", [
        {
          to: nonfungiblePositionManager,
          data: factorySelector
        },
        "latest"
      ]);

      rpcChecks.nfpmFactoryAddress = decodeAddressFromWord(factoryResult);
      rpcChecks.nfpmFactoryMatchesConfiguredFactory = sameAddress(rpcChecks.nfpmFactoryAddress, factoryAddress);

      if (!rpcChecks.nfpmFactoryMatchesConfiguredFactory) {
        issue("nfpm.factory", `NFPM factory ${rpcChecks.nfpmFactoryAddress} does not match configured factory ${factoryAddress}.`);
      }

      const getPoolSelector = "0x1698ee82";
      const getPoolCalldata =
        getPoolSelector +
        encodeAddress(token0.address) +
        encodeAddress(token1.address) +
        encodeUint24(parsedFeeTier);

      const getPoolResult = await rpcCall(rpcUrl, "eth_call", [
        {
          to: factoryAddress,
          data: getPoolCalldata
        },
        "latest"
      ]);

      const poolAddress = decodeAddressFromWord(getPoolResult);

      rpcChecks.factoryGetPoolCallSucceeded = Boolean(getPoolResult && getPoolResult !== "0x");
      rpcChecks.factoryGetPoolAddress = poolAddress;
      rpcChecks.factoryGetPoolFoundPool = !sameAddress(poolAddress, zeroAddress());

      if (rpcChecks.factoryGetPoolFoundPool) {
        issue("factory.getPool", `Factory getPool returned an existing pool: ${poolAddress}`);
      }
    } catch (error) {
      issue("rpc", error.message);
    }
  }

  const status = issues.length === 0
    ? "DEX_POOL_CREATION_FACTORY_ROUTER_EXECUTION_PATH_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED"
    : "DEX_POOL_CREATION_FACTORY_ROUTER_EXECUTION_PATH_REVIEW_REQUIRED";

  const review = {
    schema: "astra-dex-pool-creation-factory-router-execution-path-review-v0.1",
    generatedAt: new Date().toISOString(),
    status,
    network: config.network,
    selectedPublicPurchasePath: "dex-liquidity-pool-trading",
    intendedExecutionPath: {
      targetRole: config.intendedExecutionTargetRole,
      targetAddress: nonfungiblePositionManager,
      operation: config.intendedOperation,
      value: config.intendedValue,
      functionName: config.intendedFunctionName,
      functionSignature: config.intendedFunctionSignature,
      encodedCallDataGenerated: false,
      safePayloadGenerated: false,
      safeTransactionPrepared: false
    },
    selectedInputsForLaterPayloadGeneration: {
      token0Symbol: token0.symbol || "",
      token0Address: token0.address || "",
      token1Symbol: token1.symbol || "",
      token1Address: token1.address || "",
      fee: parsedFeeTier,
      sqrtPriceX96,
      generatesEncodedCallData: false
    },
    routeReview: {
      nonfungiblePositionManagerUsedForPoolCreation: true,
      factoryUsedForReadOnlyGetPoolAndNFPMMapping: true,
      swapRouter02RequiredForPoolCreationOnly: false,
      universalRouterRequiredForPoolCreationOnly: false,
      quoterRequiredForPoolCreationOnly: false,
      erc20TokenApprovalsRequiredForPoolCreationOnly: false,
      liquidityMintingIsSeparateLaterStep: true
    },
    rpcChecks,
    requiredBeforeSafePayloadGeneration: config.requiredBeforeSafePayloadGeneration,
    hardStops: config.hardStops,
    issues,
    safety: {
      sendsTransactions: false,
      movesFunds: false,
      createsLiquidityPool: false,
      addsLiquidity: false,
      enablesPublicTrading: false,
      generatesEncodedCallData: false,
      generatesSafePayload: false,
      preparesSafeTransaction: false,
      executesSafeTransaction: false,
      activatesBuyPage: false,
      approvesFullLaunch: false
    }
  };

  writeJson(reportFile, review);

  console.log(JSON.stringify({
    schema: "astra-dex-pool-creation-factory-router-execution-path-review-result-v0.1",
    checkedAt: review.generatedAt,
    status,
    target: nonfungiblePositionManager,
    factory: factoryAddress,
    nfpmFactoryMatchesConfiguredFactory: rpcChecks.nfpmFactoryMatchesConfiguredFactory,
    factoryGetPoolAddress: rpcChecks.factoryGetPoolAddress,
    factoryGetPoolFoundPool: rpcChecks.factoryGetPoolFoundPool,
    encodedCallDataGenerated: false,
    safePayloadGenerated: false,
    safeTransactionPrepared: false,
    poolCreated: false,
    liquidityAdded: false,
    movesFunds: false,
    approvesPublicTrading: false
  }, null, 2));

  if (issues.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
