import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const reportDir = path.join(root, "reports", "dex-pool-creation-token-ordering-sqrtprice");
const reportFile = path.join(reportDir, "dex-pool-creation-token-ordering-sqrtprice-review.json");

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

function addressToBigInt(value) {
  return BigInt(normalizeAddress(value).toLowerCase());
}

function token0First(addressA, addressB) {
  return addressToBigInt(addressA) < addressToBigInt(addressB);
}

function isNonEmptyCode(value) {
  return typeof value === "string" && value !== "0x" && value.length > 2;
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

async function readDecimals(rpcUrl, address, label) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {
      to: address,
      data: "0x313ce567"
    },
    "latest"
  ]);

  if (!/^0x[0-9a-fA-F]{64}$/.test(result)) {
    throw new Error(`${label} decimals() returned unexpected data: ${result}`);
  }

  const value = Number(BigInt(result));

  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new Error(`${label} decimals() value is out of range: ${value}`);
  }

  return value;
}

function pow10(n) {
  return 10n ** BigInt(n);
}

function parseDecimalToFraction(value) {
  let s = String(value || "").trim().replace(/,/g, "").toLowerCase();

  if (!s) {
    throw new Error("empty decimal value");
  }

  let sign = 1n;

  if (s.startsWith("-")) {
    sign = -1n;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }

  let exponent = 0;

  if (s.includes("e")) {
    const parts = s.split("e");

    if (parts.length !== 2) {
      throw new Error(`invalid decimal exponent: ${value}`);
    }

    s = parts[0];
    exponent = Number(parts[1]);

    if (!Number.isInteger(exponent)) {
      throw new Error(`invalid exponent: ${value}`);
    }
  }

  if (!/^\d*(\.\d*)?$/.test(s) || s === "." || s === "") {
    throw new Error(`invalid decimal number: ${value}`);
  }

  const [wholeRaw, fracRaw = ""] = s.split(".");
  const whole = wholeRaw || "0";
  const frac = fracRaw || "";

  let numerator = BigInt(`${whole}${frac}` || "0");
  let denominator = pow10(frac.length);

  if (exponent > 0) {
    numerator *= pow10(exponent);
  } else if (exponent < 0) {
    denominator *= pow10(-exponent);
  }

  numerator *= sign;

  if (numerator <= 0n) {
    throw new Error(`price must be positive: ${value}`);
  }

  const g = gcd(numerator, denominator);

  return {
    numerator: numerator / g,
    denominator: denominator / g
  };
}

function gcd(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;

  while (y !== 0n) {
    const t = y;
    y = x % y;
    x = t;
  }

  return x;
}

function integerSqrt(value) {
  if (value < 0n) throw new Error("square root of negative number");
  if (value < 2n) return value;

  let x0 = value;
  let x1 = (x0 + value / x0) >> 1n;

  while (x1 < x0) {
    x0 = x1;
    x1 = (x0 + value / x0) >> 1n;
  }

  return x0;
}

function extractInitialPriceHuman(selection, draft) {
  const envPrice = process.env.ASTRA_PRICE_COUNTER_ASSET || "";

  if (envPrice.trim()) return envPrice.trim();

  const candidates = [
    selection.initialPriceHuman,
    draft.selectedParameters?.initialPriceHuman
  ].filter(Boolean);

  for (const candidate of candidates) {
    const raw = String(candidate).replace(/,/g, "");

    let match = raw.match(/1\s+ASTRA\s*=\s*([0-9]+(?:\.[0-9]+)?(?:e[+-]?\d+)?)\s*[A-Za-z0-9]+/i);

    if (match) return match[1];

    match = raw.match(/([0-9]+(?:\.[0-9]+)?(?:e[+-]?\d+)?)\s*[A-Za-z0-9]+\s*(?:per|\/)\s*ASTRA/i);

    if (match) return match[1];
  }

  throw new Error("Could not parse initial price. Set ASTRA_PRICE_COUNTER_ASSET to the counter-asset price per 1 ASTRA.");
}

function computeSqrtPriceX96({
  priceNumerator,
  priceDenominator,
  astraDecimals,
  counterDecimals,
  astraIsToken0
}) {
  let ratioNumerator;
  let ratioDenominator;

  if (astraIsToken0) {
    // token0 = ASTRA, token1 = counter asset.
    // raw ratio = counterRaw / astraRaw = price * 10^counterDecimals / 10^astraDecimals
    ratioNumerator = priceNumerator * pow10(counterDecimals);
    ratioDenominator = priceDenominator * pow10(astraDecimals);
  } else {
    // token0 = counter asset, token1 = ASTRA.
    // raw ratio = astraRaw / counterRaw = (1 / price) * 10^astraDecimals / 10^counterDecimals
    ratioNumerator = priceDenominator * pow10(astraDecimals);
    ratioDenominator = priceNumerator * pow10(counterDecimals);
  }

  const g = gcd(ratioNumerator, ratioDenominator);

  ratioNumerator /= g;
  ratioDenominator /= g;

  const q192 = 1n << 192n;
  const sqrtInput = (ratioNumerator * q192) / ratioDenominator;
  const sqrtPriceX96 = integerSqrt(sqrtInput);

  return {
    ratioNumerator,
    ratioDenominator,
    sqrtPriceX96
  };
}

async function main() {
  fs.mkdirSync(reportDir, { recursive: true });

  const config = readJson("configs/dex-pool-creation-token-ordering-sqrtprice.config.json");
  const draft = readJson("reports/dex-pool-creation-safe-payload-draft/dex-pool-creation-safe-payload-draft.json");
  const selection = readJson("reports/dex-liquidity-parameter-selection/import/dex-liquidity-parameter-selection.json");

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
    issue("config", "Token ordering and sqrtPriceX96 review must be prepared and review-only.");
  }

  if (draftReview.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_DRAFT_REVIEW_READY_FOR_SQRTPRICEX96_REVIEW_NO_PAYLOAD_GENERATED") {
    issue("draftReview.status", "Safe payload draft review must be ready for sqrtPriceX96 review.");
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
    issue("precheck.status", "Fresh pool existence precheck must show NO_POOL_FOUND.");
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
    process.env.DEX_SQRTPRICE_REVIEW_RPC_URL ||
    process.env.DEX_POOL_PRECHECK_RPC_URL ||
    process.env.MAINNET_MONITOR_RPC_URL ||
    readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

  if (!String(rpcUrl || "").startsWith("https://")) {
    issue("DEX_SQRTPRICE_REVIEW_RPC_URL", "RPC URL must be available and start with https://.");
  }

  const astraTokenAddress = normalizeAddress(selection.astraTokenAddress || draft.selectedParameters?.astraTokenAddress);
  const counterAssetAddress = normalizeAddress(selection.counterAssetAddress || draft.selectedParameters?.counterAssetAddress);
  const counterAssetSymbol = String(selection.counterAssetSymbol || draft.selectedParameters?.counterAssetSymbol || "counter-asset");

  if (!isAddress(astraTokenAddress)) {
    issue("astraTokenAddress", "ASTRA token address is invalid.");
  }

  if (!isAddress(counterAssetAddress)) {
    issue("counterAssetAddress", "Counter-asset address is invalid.");
  }

  let astraDecimals = null;
  let counterDecimals = null;
  let astraCodePresent = false;
  let counterCodePresent = false;
  let counterAssetCodePresent = false;
  let priceString = "";
  let priceFraction = null;
  let tokenOrderingReview = {};
  let sqrtPriceX96Review = {};

  if (issues.length === 0) {
    try {
      const astraCode = await rpcCall(rpcUrl, "eth_getCode", [astraTokenAddress, "latest"]);
      const counterCode = await rpcCall(rpcUrl, "eth_getCode", [counterAssetAddress, "latest"]);

      astraCodePresent = isNonEmptyCode(astraCode);
      counterCodePresent = isNonEmptyCode(counterCode);
      counterAssetCodePresent = counterCodePresent;

      if (!astraCodePresent) {
        issue("astraTokenCode", "ASTRA token address has no contract code.");
      }

      if (!counterCodePresent) {
        issue("counterAssetCode", "Counter-asset address has no contract code.");
      }

      astraDecimals = await readDecimals(rpcUrl, astraTokenAddress, "ASTRA");
      counterDecimals = await readDecimals(rpcUrl, counterAssetAddress, counterAssetSymbol);

      priceString = extractInitialPriceHuman(selection, draft);
      priceFraction = parseDecimalToFraction(priceString);

      const astraIsToken0 = token0First(astraTokenAddress, counterAssetAddress);

      const token0 = astraIsToken0
        ? { symbol: "ASTRA", address: astraTokenAddress, decimals: astraDecimals }
        : { symbol: counterAssetSymbol, address: counterAssetAddress, decimals: counterDecimals };

      const token1 = astraIsToken0
        ? { symbol: counterAssetSymbol, address: counterAssetAddress, decimals: counterDecimals }
        : { symbol: "ASTRA", address: astraTokenAddress, decimals: astraDecimals };

      const sqrtReview = computeSqrtPriceX96({
        priceNumerator: priceFraction.numerator,
        priceDenominator: priceFraction.denominator,
        astraDecimals,
        counterDecimals,
        astraIsToken0
      });

      tokenOrderingReview = {
        status: "TOKEN_ORDERING_DERIVED_FOR_REVIEW_NO_PAYLOAD",
        token0,
        token1,
        astraIsToken0,
        orderingRule: "Uniswap v3 token0/token1 ordering is derived by ascending token address.",
        reviewedForPayloadGeneration: false
      };

      sqrtPriceX96Review = {
        status: "SQRTPRICEX96_CALCULATED_FOR_REVIEW_NO_PAYLOAD",
        humanPriceInput: `1 ASTRA = ${priceString} ${counterAssetSymbol}`,
        priceNumerator: priceFraction.numerator.toString(),
        priceDenominator: priceFraction.denominator.toString(),
        astraDecimals,
        counterAssetDecimals: counterDecimals,
        rawRatioMeaning: "amount1 / amount0 in raw token units",
        rawRatioNumerator: sqrtReview.ratioNumerator.toString(),
        rawRatioDenominator: sqrtReview.ratioDenominator.toString(),
        sqrtPriceX96: sqrtReview.sqrtPriceX96.toString(),
        formula: "floor(sqrt(amount1 / amount0) * 2^96)",
        encodedCallDataGenerated: false,
        safePayloadGenerated: false,
        approvedForPayloadGeneration: false
      };
    } catch (error) {
      issue("sqrtPriceX96Review", error.message);
    }
  }

  const status = issues.length === 0
    ? "DEX_POOL_CREATION_TOKEN_ORDERING_SQRTPRICEX96_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED"
    : "DEX_POOL_CREATION_TOKEN_ORDERING_SQRTPRICEX96_REVIEW_REQUIRED";

  const report = {
    schema: "astra-dex-pool-creation-token-ordering-sqrtpricex96-review-v0.1",
    generatedAt: new Date().toISOString(),
    status,
    network: config.network,
    selectedPublicPurchasePath: "dex-liquidity-pool-trading",
    intendedFunctionSignature: config.intendedFunctionSignature,
    selectedPair: selection.tokenPair || draft.selectedParameters?.selectedPair || "",
    poolVersion: selection.poolVersion || draft.selectedParameters?.poolVersion || "",
    feeTierOrPoolType: selection.feeTierOrPoolType || draft.selectedParameters?.feeTierOrPoolType || "",
    astraTokenAddress,
    counterAssetSymbol,
    counterAssetAddress,
    rpcChecks: {
      astraCodePresent,
      counterAssetCodePresent: counterCodePresent,
      astraDecimals,
      counterAssetDecimals: counterDecimals,
      readOnlyRpcOnly: true
    },
    tokenOrderingReview,
    sqrtPriceX96Review,
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

  writeJson(reportFile, report);

  console.log(JSON.stringify({
    schema: "astra-dex-pool-creation-token-ordering-sqrtpricex96-review-result-v0.1",
    checkedAt: report.generatedAt,
    status,
    token0: tokenOrderingReview.token0?.symbol || "",
    token0Address: tokenOrderingReview.token0?.address || "",
    token1: tokenOrderingReview.token1?.symbol || "",
    token1Address: tokenOrderingReview.token1?.address || "",
    sqrtPriceX96: sqrtPriceX96Review.sqrtPriceX96 || "",
    encodedCallDataGenerated: false,
    safePayloadGenerated: false,
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
