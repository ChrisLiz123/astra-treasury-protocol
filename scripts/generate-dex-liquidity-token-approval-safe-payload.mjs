import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const confirm = process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_CONFIRM || "";
const overwrite = process.env.OVERWRITE_DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD || "";

const requiredConfirm = "GENERATE_DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_ONLY";

const payloadDir = path.join(root, "reports", "dex-liquidity-token-approval", "payload");
const payloadFile = path.join(payloadDir, "token-approval-safe-payload.json");
const transactionBuilderFile = path.join(payloadDir, "token-approval-safe-transaction-builder.json");

const reportDir = path.join(root, "reports", "dex-liquidity-token-approval-safe-payload");
const generationReportFile = path.join(reportDir, "dex-liquidity-token-approval-safe-payload-generation.json");

const configFile = path.join(root, "configs", "dex-liquidity-token-approval-safe-payload.config.json");

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

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value, null, 2) + "\n").digest("hex");
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function readRuntimeEnvValue(key) {
  const runtimeFile = path.join(root, ".runtime", "mainnet-monitor.env");

  if (!fs.existsSync(runtimeFile)) return "";

  for (const line of fs.readFileSync(runtimeFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [rawKey, ...rest] = trimmed.split("=");
    if (rawKey.trim() === key) return rest.join("=").trim().replace(/^["']|["']$/g, "");
  }

  return "";
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function isZeroAddress(value) {
  return String(value || "").toLowerCase() === "0x0000000000000000000000000000000000000000";
}

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function isNonEmptyCode(value) {
  return typeof value === "string" && value !== "0x" && value.length > 2;
}

function encodeAddress(value) {
  return String(value).replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

function encodeUint256(value) {
  return BigInt(String(value)).toString(16).padStart(64, "0");
}

function encodeApproveCalldata(spender, amountRaw) {
  return "0x095ea7b3" + encodeAddress(spender) + encodeUint256(amountRaw);
}

function decodeUint(value) {
  const clean = String(value || "").replace(/^0x/i, "").padStart(64, "0");
  return BigInt(`0x${clean}`);
}

async function rpcCall(rpcUrl, method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({jsonrpc: "2.0", id: 1, method, params})
  });

  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(body.error.message || JSON.stringify(body.error));
  return body.result;
}

async function readTokenBalance(rpcUrl, tokenAddress, ownerAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: tokenAddress, data: "0x70a08231" + encodeAddress(ownerAddress)},
    "latest"
  ]);

  return decodeUint(result).toString();
}

async function readTokenAllowance(rpcUrl, tokenAddress, ownerAddress, spenderAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: tokenAddress, data: "0xdd62ed3e" + encodeAddress(ownerAddress) + encodeAddress(spenderAddress)},
    "latest"
  ]);

  return decodeUint(result).toString();
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

async function main() {
  if (confirm !== requiredConfirm) {
    issue("DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_CONFIRM", `Must equal ${requiredConfirm}.`);
  }

  if ((fs.existsSync(payloadFile) || fs.existsSync(transactionBuilderFile)) && overwrite !== "YES") {
    issue("OVERWRITE_DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD", "Token approval payload already exists. Set OVERWRITE_DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD=YES only if regenerating intentionally.");
  }

  const approvalStatus = readJson("public-docs/dex-liquidity-token-approval-payload-generation-approval-status.json");
  const approvalRecord = readJson("reports/dex-liquidity-token-approval-payload-generation-approval/dex-liquidity-token-approval-payload-generation-approval-record.json");
  const recheckStatus = readJson("public-docs/dex-liquidity-token-approval-requirements-recheck-status.json");
  const recheck = readJson("reports/dex-liquidity-token-approval-requirements-recheck/dex-liquidity-token-approval-requirements-recheck.json");
  const postBalances = readJson("public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const monitor = readJson("public-docs/mainnet-monitor-status.json");
  const alerts = readJson("public-docs/mainnet-alerts-status.json");
  const incidents = readJson("public-docs/incident-summary.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  requireStatus("approvalStatus.status", approvalStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_NO_APPROVALS_EXECUTED");
  requireStatus("recheckStatus.status", recheckStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK_COMPLETE_APPROVALS_REQUIRED_NO_APPROVALS_EXECUTED");
  requireStatus("postBalances.status", postBalances.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_VERIFIED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
  requireStatus("poolStatus.status", poolStatus.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

  if (approvalStatus.summary?.tokenApprovalPayloadGenerationApproved !== true) {
    issue("approvalStatus.summary.tokenApprovalPayloadGenerationApproved", "Token approval payload generation approval must be recorded.");
  }

  if (approvalStatus.summary?.tokenApprovalPayloadGenerated !== false || approvalStatus.summary?.tokenApprovalExecuted !== false || approvalStatus.summary?.liquidityAdded !== false) {
    issue("approvalStatus.summary.flags", "Approval status must show no payload, no approval execution, and no liquidity.");
  }

  if (recheckStatus.summary?.tokenApprovalsRequiredBeforeLiquidity !== true) {
    issue("recheckStatus.summary.tokenApprovalsRequiredBeforeLiquidity", "Token approvals must be required before liquidity.");
  }

  if (recheckStatus.summary?.allRequiredBalancesAvailable !== true) {
    issue("recheckStatus.summary.allRequiredBalancesAvailable", "Required balances must be available.");
  }

  if (!isAddress(recheck.liquiditySafeAddress) || isZeroAddress(recheck.liquiditySafeAddress)) {
    issue("recheck.liquiditySafeAddress", "Liquidity Safe address must be valid.");
  }

  if (!isAddress(recheck.approvalSpender) || isZeroAddress(recheck.approvalSpender)) {
    issue("recheck.approvalSpender", "Approval spender must be valid.");
  }

  if (postBalances.summary?.destinationBalancesFunded !== true || postBalances.summary?.poolLiquidityVerifiedZero !== true) {
    issue("postBalances.summary", "Destination balances must be funded and pool liquidity must be zero.");
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
    "reports/dex-liquidity-token-approval/live/token-approval-executed.json",
    "reports/dex-liquidity-provision/payload/token-approval-safe-payload.json",
    "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
    "reports/dex-liquidity-provision/live/liquidity-added.json",
    "reports/dex-liquidity-provision/live/position-minted.json",
    "public-docs/dex-liquidity-added-status.json",
    "public-docs/dex-public-trading-live-status.json"
  ];

  for (const file of forbiddenFiles) {
    if (fs.existsSync(path.join(root, file))) {
      issue(file, "Forbidden token-approval-live/liquidity/public-trading artifact exists. Payload generation must not execute approvals or add liquidity.");
    }
  }

  const requiredApprovalItems = Array.isArray(approvalRecord.requiredApprovalTokenRequirements)
    ? approvalRecord.requiredApprovalTokenRequirements
    : [];

  if (requiredApprovalItems.length <= 0) {
    issue("approvalRecord.requiredApprovalTokenRequirements", "At least one required approval token must be present.");
  }

  const rpcUrl =
    process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_RPC_URL ||
    process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_RECHECK_RPC_URL ||
    process.env.DEX_POST_EXECUTION_RPC_URL ||
    process.env.MAINNET_MONITOR_RPC_URL ||
    readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

  if (!String(rpcUrl || "").startsWith("https://")) {
    issue("DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_RPC_URL", "RPC URL must be available and start with https://.");
  }

  const liquiditySafeAddress = recheck.liquiditySafeAddress;
  const approvalSpender = recheck.approvalSpender;

  const generatedApprovalTransactions = [];

  if (issues.length === 0) {
    try {
      const safeCode = await rpcCall(rpcUrl, "eth_getCode", [liquiditySafeAddress, "latest"]);

      if (!isNonEmptyCode(safeCode)) {
        issue("liquiditySafeAddress.code", "Liquidity Safe must have contract code.");
      }

      const spenderCode = await rpcCall(rpcUrl, "eth_getCode", [approvalSpender, "latest"]);

      if (!isNonEmptyCode(spenderCode)) {
        issue("approvalSpender.code", "Approval spender must have contract code.");
      }

      for (const item of requiredApprovalItems) {
        if (!isAddress(item.tokenAddress)) {
          issue(`token.${item.symbol}.tokenAddress`, "Token address must be valid.");
          continue;
        }

        const tokenCode = await rpcCall(rpcUrl, "eth_getCode", [item.tokenAddress, "latest"]);

        if (!isNonEmptyCode(tokenCode)) {
          issue(`token.${item.symbol}.code`, "Token address must have contract code.");
        }

        const recommendedApprovalAmountRaw = String(item.recommendedApprovalAmountRaw || item.desiredRaw || "0");

        if (!/^\d+$/.test(recommendedApprovalAmountRaw) || BigInt(recommendedApprovalAmountRaw) <= 0n) {
          issue(`token.${item.symbol}.recommendedApprovalAmountRaw`, "Recommended approval amount must be positive.");
          continue;
        }

        const currentBalanceRaw = await readTokenBalance(rpcUrl, item.tokenAddress, liquiditySafeAddress);
        const currentAllowanceRaw = await readTokenAllowance(rpcUrl, item.tokenAddress, liquiditySafeAddress, approvalSpender);

        if (BigInt(currentBalanceRaw || "0") < BigInt(recommendedApprovalAmountRaw)) {
          issue(`token.${item.symbol}.balance`, `Liquidity Safe balance ${currentBalanceRaw} is below approval amount ${recommendedApprovalAmountRaw}.`);
        }

        if (BigInt(currentAllowanceRaw || "0") >= BigInt(recommendedApprovalAmountRaw)) {
          issue(`token.${item.symbol}.allowance`, "Current allowance already covers the recommended amount. Rerun the approval requirements recheck instead of generating a stale approval payload.");
        }

        if (BigInt(currentAllowanceRaw || "0") > 0n) {
          const resetData = encodeApproveCalldata(approvalSpender, "0");

          generatedApprovalTransactions.push({
            id: `approve-reset-${item.role || item.symbol || "token"}`,
            role: item.role,
            symbol: item.symbol,
            tokenAddress: item.tokenAddress,
            safeAddress: liquiditySafeAddress,
            to: item.tokenAddress,
            value: "0",
            data: resetData,
            dataHash: sha256Hex(resetData),
            operation: "CALL",
            operationValue: 0,
            functionSelector: "0x095ea7b3",
            functionSignature: "approve(address,uint256)",
            approvalSpender,
            amountRaw: "0",
            amountHuman: "0",
            approvalMode: "reset-existing-allowance-to-zero-before-final-approval",
            currentBalanceRaw,
            currentAllowanceRaw,
            recommendedApprovalAmountRaw,
            tokenApprovalSafeTransactionSubmitted: false,
            tokenApprovalExecuted: false
          });
        }

        const data = encodeApproveCalldata(approvalSpender, recommendedApprovalAmountRaw);

        generatedApprovalTransactions.push({
          id: `approve-${item.role || item.symbol || "token"}`,
          role: item.role,
          symbol: item.symbol,
          tokenAddress: item.tokenAddress,
          safeAddress: liquiditySafeAddress,
          to: item.tokenAddress,
          value: "0",
          data,
          dataHash: sha256Hex(data),
          operation: "CALL",
          operationValue: 0,
          functionSelector: "0x095ea7b3",
          functionSignature: "approve(address,uint256)",
          approvalSpender,
          amountRaw: recommendedApprovalAmountRaw,
          amountHuman: item.recommendedApprovalAmountHuman || item.desiredHuman || "",
          approvalMode: "set-allowance-to-required-amount",
          currentBalanceRaw,
          currentAllowanceRaw,
          recommendedApprovalAmountRaw,
          tokenApprovalSafeTransactionSubmitted: false,
          tokenApprovalExecuted: false
        });
      }
    } catch (error) {
      issue("rpc", error.message);
    }
  }

  if (generatedApprovalTransactions.length <= 0 && issues.length === 0) {
    issue("generatedApprovalTransactions", "No approval transactions were generated.");
  }

  if (issues.length > 0) {
    console.log(JSON.stringify({
      schema: "astra-dex-liquidity-token-approval-safe-payload-generation-result-v0.1",
      checkedAt: new Date().toISOString(),
      status: "STOP_DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_NOT_GENERATED",
      issues
    }, null, 2));
    process.exit(1);
  }

  fs.mkdirSync(payloadDir, { recursive: true });
  fs.mkdirSync(reportDir, { recursive: true });

  const generatedAt = new Date().toISOString();

  const payload = {
    schema: "astra-dex-liquidity-token-approval-safe-payload-v0.1",
    generatedAt,
    status: "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY",
    chainId: 8453,
    network: "Base Mainnet",
    selectedPublicPurchasePath: "dex-liquidity-pool-trading",
    liquiditySafeAddress,
    approvalSpender,
    tokenApprovalPayloadGenerationApprovalReference: "public-docs/dex-liquidity-token-approval-payload-generation-approval-status.json",
    tokenApprovalRequirementsRecheckReference: "public-docs/dex-liquidity-token-approval-requirements-recheck-status.json",
    transactionCount: generatedApprovalTransactions.length,
    transactions: generatedApprovalTransactions,
    aggregate: {
      liquiditySafeAddress,
      approvalSpender,
      approvalTransactionCount: generatedApprovalTransactions.length,
      tokenCount: requiredApprovalItems.length,
      tokenSymbols: [...new Set(generatedApprovalTransactions.map((item) => item.symbol).filter(Boolean))],
      totalCalldataBytes: generatedApprovalTransactions.reduce((sum, item) => sum + ((item.data.length - 2) / 2), 0)
    },
    flags: {
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
      fullLaunchApproved: false
    },
    safety: {
      localPayloadOnly: true,
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

  payload.payloadHash = sha256Json(payload);

  const transactionBuilder = {
    version: "1.0",
    chainId: "8453",
    createdAt: Date.now(),
    meta: {
      name: "Astra DEX Liquidity Token Approval Payload",
      description: `Approve required DEX liquidity spender from liquidity Safe ${liquiditySafeAddress}`,
      txBuilderVersion: "1.17.1",
      createdFromSafeAddress: liquiditySafeAddress,
      createdFromOwnerAddress: "",
      checksum: ""
    },
    transactions: generatedApprovalTransactions.map((tx) => ({
      to: tx.to,
      value: tx.value,
      data: tx.data,
      contractMethod: null,
      contractInputsValues: null
    }))
  };

  transactionBuilder.transactionBuilderHash = sha256Json(transactionBuilder);

  writeJson(payloadFile, payload);
  writeJson(transactionBuilderFile, transactionBuilder);

  const generationReport = {
    schema: "astra-dex-liquidity-token-approval-safe-payload-generation-report-v0.1",
    generatedAt,
    status: payload.status,
    payloadFile: "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json",
    transactionBuilderFile: "reports/dex-liquidity-token-approval/payload/token-approval-safe-transaction-builder.json",
    payloadHash: payload.payloadHash,
    transactionBuilderHash: transactionBuilder.transactionBuilderHash,
    liquiditySafeAddress,
    approvalSpender,
    transactionCount: generatedApprovalTransactions.length,
    tokenApprovalSafePayloadGenerated: true,
    tokenApprovalSafeTransactionSubmitted: false,
    tokenApprovalExecuted: false,
    liquidityAdded: false,
    positionMinted: false,
    publicTradingApproved: false,
    fullLaunchApproved: false
  };

  writeJson(generationReportFile, generationReport);

  const config = readJsonPath(configFile);

  config.status = "token-approval-safe-payload-generated-not-submitted-no-approvals-executed-no-liquidity";
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
  config.generatedTokenApprovalSafePayload = {
    generatedAt,
    liquiditySafeAddress,
    approvalSpender,
    transactionCount: generatedApprovalTransactions.length,
    payloadHash: payload.payloadHash,
    transactionBuilderHash: transactionBuilder.transactionBuilderHash,
    payloadFile: "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json",
    transactionBuilderFile: "reports/dex-liquidity-token-approval/payload/token-approval-safe-transaction-builder.json"
  };

  writeJson(configFile, config);

  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-token-approval-safe-payload-generation-result-v0.1",
    checkedAt: generatedAt,
    status: payload.status,
    payloadFile: "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json",
    transactionBuilderFile: "reports/dex-liquidity-token-approval/payload/token-approval-safe-transaction-builder.json",
    payloadHash: payload.payloadHash,
    transactionBuilderHash: transactionBuilder.transactionBuilderHash,
    liquiditySafeAddress,
    approvalSpender,
    transactionCount: generatedApprovalTransactions.length,
    tokenApprovalSafePayloadGenerated: true,
    tokenApprovalSafeTransactionSubmitted: false,
    tokenApprovalExecuted: false,
    liquidityAdded: false,
    positionMinted: false,
    publicTradingApproved: false,
    fullLaunchApproved: false
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
