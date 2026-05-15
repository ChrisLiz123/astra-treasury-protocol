import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const payloadRelativePath = "reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json";
const verificationDir = path.join(root, "reports", "dex-liquidity-funding-transfer-safe-payload-verification");
const verificationFile = path.join(verificationDir, "dex-liquidity-funding-transfer-safe-payload-verification.json");

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

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
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

function decodeAddressFromWord(word) {
  const clean = String(word || "").replace(/^0x/i, "").padStart(64, "0");
  return `0x${clean.slice(-40)}`;
}

function decodeUint256FromWord(word) {
  const clean = String(word || "").replace(/^0x/i, "").padStart(64, "0");
  return BigInt(`0x${clean}`).toString();
}

function decodeTransferCalldata(data) {
  const clean = String(data || "").replace(/^0x/i, "");

  if (!clean.startsWith("a9059cbb")) {
    throw new Error("Calldata does not start with ERC-20 transfer selector.");
  }

  const recipientWord = clean.slice(8, 72);
  const amountWord = clean.slice(72, 136);

  if (recipientWord.length !== 64 || amountWord.length !== 64) {
    throw new Error("Calldata is not the expected ERC-20 transfer(address,uint256) length.");
  }

  return {
    selector: "0xa9059cbb",
    recipient: decodeAddressFromWord(recipientWord),
    amountRaw: decodeUint256FromWord(amountWord)
  };
}

function decodeUint(value) {
  const clean = String(value || "").replace(/^0x/i, "").padStart(64, "0");
  return BigInt(`0x${clean}`);
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

async function readTokenBalance(rpcUrl, tokenAddress, ownerAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {
      to: tokenAddress,
      data: "0x70a08231" + encodeAddress(ownerAddress)
    },
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
  fs.mkdirSync(verificationDir, { recursive: true });

  const config = readJson("configs/dex-liquidity-funding-transfer-safe-payload-verification.config.json");
  const payload = readJson(payloadRelativePath);
  const payloadStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-payload-status.json");
  const payloadGeneration = readJson("reports/dex-liquidity-funding-transfer-safe-payload/dex-liquidity-funding-transfer-safe-payload-generation.json");
  const payloadApproval = readJson("public-docs/dex-liquidity-funding-transfer-payload-generation-approval-status.json");
  const transferApproval = readJson("public-docs/dex-liquidity-funding-transfer-approval-status.json");
  const requirementsStatus = readJson("public-docs/dex-liquidity-funding-transfer-requirements-status.json");
  const requirementsReview = readJson("reports/dex-liquidity-funding-transfer-requirements/dex-liquidity-funding-transfer-requirements-review.json");
  const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const monitor = readJson("public-docs/mainnet-monitor-status.json");
  const alerts = readJson("public-docs/mainnet-alerts-status.json");
  const incidents = readJson("public-docs/incident-summary.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.verificationPrepared !== true || config.verificationOnly !== true) {
    issue("config", "Funding-transfer Safe payload verification must be prepared and verification-only.");
  }

  requireStatus("payload.status", payload.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_FUNDS_MOVED");
  requireStatus("payloadStatus.status", payloadStatus.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_FUNDS_MOVED");
  requireStatus("payloadGeneration.status", payloadGeneration.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_FUNDS_MOVED");
  requireStatus("payloadApproval.status", payloadApproval.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_NO_FUNDS_MOVED");
  requireStatus("transferApproval.status", transferApproval.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_APPROVED_NO_PAYLOAD_NO_FUNDS_MOVED");
  requireStatus("requirementsStatus.status", requirementsStatus.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_REQUIREMENTS_REVIEW_COMPLETE_NO_FUNDS_MOVED");
  requireStatus("postExecution.status", postExecution.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

  if (payload.flags?.fundingTransferSubmitted !== false || payload.flags?.fundingTransferExecuted !== false || payload.flags?.treasuryFundsMoved !== false) {
    issue("payload.flags", "Payload must remain not submitted, not executed, and no treasury funds moved.");
  }

  if (payloadStatus.summary?.fundingTransferSubmitted !== false || payloadStatus.summary?.fundingTransferExecuted !== false || payloadStatus.summary?.treasuryFundsMoved !== false) {
    issue("payloadStatus.summary", "Public payload status must show not submitted, not executed, and no treasury funds moved.");
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
    "reports/dex-liquidity-provision/live/liquidity-added.json",
    "reports/dex-liquidity-provision/live/position-minted.json",
    "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
    "reports/dex-liquidity-provision/payload/token-approval-safe-payload.json",
    "reports/dex-liquidity-treasury-funding/live/funds-moved.json",
    "public-docs/dex-liquidity-added-status.json",
    "public-docs/dex-public-trading-live-status.json"
  ];

  for (const file of forbiddenFiles) {
    if (fs.existsSync(path.join(root, file))) {
      issue(file, "Forbidden live/liquidity/public-trading artifact exists. Verification must not move funds or add liquidity.");
    }
  }

  if (!isAddress(payload.sourceSafeAddress) || isZeroAddress(payload.sourceSafeAddress)) {
    issue("payload.sourceSafeAddress", "Source Safe address must be valid.");
  }

  if (!isAddress(payload.destinationSafeAddress) || isZeroAddress(payload.destinationSafeAddress)) {
    issue("payload.destinationSafeAddress", "Destination Safe address must be valid.");
  }

  if (!Array.isArray(payload.transactions) || payload.transactions.length <= 0) {
    issue("payload.transactions", "Payload must contain transfer transactions.");
  }

  const payloadForHash = JSON.parse(JSON.stringify(payload));
  const recordedPayloadHash = payloadForHash.payloadHash || "";
  delete payloadForHash.payloadHash;
  const recomputedPayloadHash = sha256Json(payloadForHash);
  const payloadHashVerified = recordedPayloadHash === recomputedPayloadHash;

  if (!payloadHashVerified) {
    issue("payload.payloadHash", "Payload hash does not match recomputed hash.");
  }

  const rpcUrl =
    process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_VERIFICATION_RPC_URL ||
    process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_RPC_URL ||
    process.env.DEX_POST_EXECUTION_RPC_URL ||
    process.env.MAINNET_MONITOR_RPC_URL ||
    readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

  if (!String(rpcUrl || "").startsWith("https://")) {
    issue("DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_VERIFICATION_RPC_URL", "RPC URL must be available and start with https://.");
  }

  const requirementItems = requirementsReview.fundingTransferRequirements?.tokenTransferRequirements || [];
  const transactionChecks = [];

  if (issues.length === 0) {
    try {
      const sourceCode = await rpcCall(rpcUrl, "eth_getCode", [payload.sourceSafeAddress, "latest"]);
      const destinationCode = await rpcCall(rpcUrl, "eth_getCode", [payload.destinationSafeAddress, "latest"]);

      if (!isNonEmptyCode(sourceCode)) {
        issue("sourceSafe.code", "Source Safe/source contract must have code.");
      }

      if (!isNonEmptyCode(destinationCode)) {
        issue("destinationSafe.code", "Destination Safe must have code.");
      }

      for (const tx of payload.transactions) {
        const decoded = decodeTransferCalldata(tx.data);
        const matchingRequirement = requirementItems.find((item) => sameAddress(item.tokenAddress, tx.tokenAddress));

        if (!matchingRequirement) {
          issue(`transactions.${tx.id}.requirement`, "No matching funding-transfer requirement found.");
          continue;
        }

        if (!sameAddress(tx.safeAddress, payload.sourceSafeAddress)) {
          issue(`transactions.${tx.id}.safeAddress`, "Transaction Safe address must match payload source Safe.");
        }

        if (!sameAddress(tx.to, tx.tokenAddress)) {
          issue(`transactions.${tx.id}.to`, "Transaction target must be the token contract.");
        }

        if (String(tx.value) !== "0") {
          issue(`transactions.${tx.id}.value`, "ERC-20 transfer value must be zero.");
        }

        if (tx.operation !== "CALL" || tx.operationValue !== 0) {
          issue(`transactions.${tx.id}.operation`, "Operation must be CALL / 0.");
        }

        if (!sameAddress(decoded.recipient, payload.destinationSafeAddress)) {
          issue(`transactions.${tx.id}.recipient`, "Decoded recipient must match destination Safe.");
        }

        if (String(decoded.amountRaw) !== String(tx.amountRaw)) {
          issue(`transactions.${tx.id}.amountRaw`, "Decoded transfer amount must match transaction amount.");
        }

        if (String(tx.amountRaw) !== String(matchingRequirement.shortfallRaw)) {
          issue(`transactions.${tx.id}.shortfallRaw`, "Transaction amount must match approved shortfall.");
        }

        if (sha256Hex(tx.data) !== tx.dataHash) {
          issue(`transactions.${tx.id}.dataHash`, "Transaction data hash mismatch.");
        }

        const sourceBalanceRaw = await readTokenBalance(rpcUrl, tx.tokenAddress, payload.sourceSafeAddress);
        const destinationBalanceRaw = await readTokenBalance(rpcUrl, tx.tokenAddress, payload.destinationSafeAddress);

        const sourceBalanceCoversTransfer = BigInt(sourceBalanceRaw || "0") >= BigInt(tx.amountRaw || "0");
        const destinationBalanceUnchanged = String(destinationBalanceRaw) === String(matchingRequirement.currentSafeBalanceRaw || "0");

        if (!sourceBalanceCoversTransfer) {
          issue(`transactions.${tx.id}.sourceBalance`, `Source balance ${sourceBalanceRaw} no longer covers transfer ${tx.amountRaw}.`);
        }

        if (!destinationBalanceUnchanged) {
          issue(`transactions.${tx.id}.destinationBalance`, `Destination balance ${destinationBalanceRaw} differs from requirements-review balance ${matchingRequirement.currentSafeBalanceRaw}.`);
        }

        transactionChecks.push({
          id: tx.id,
          role: tx.role,
          symbol: tx.symbol,
          tokenAddress: tx.tokenAddress,
          decodedRecipient: decoded.recipient,
          decodedAmountRaw: decoded.amountRaw,
          expectedShortfallRaw: matchingRequirement.shortfallRaw,
          calldataVerified: sameAddress(decoded.recipient, payload.destinationSafeAddress) && String(decoded.amountRaw) === String(tx.amountRaw),
          amountMatchesShortfall: String(tx.amountRaw) === String(matchingRequirement.shortfallRaw),
          sourceBalanceRaw,
          sourceBalanceCoversTransfer,
          destinationBalanceRaw,
          requirementsReviewDestinationBalanceRaw: matchingRequirement.currentSafeBalanceRaw || "0",
          destinationBalanceUnchanged,
          fundingTransferSubmitted: false,
          fundingTransferExecuted: false
        });
      }
    } catch (error) {
      issue("verificationRpc", error.message);
    }
  }

  const status = issues.length === 0
    ? "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_FUNDS_MOVED"
    : "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_VERIFICATION_REQUIRED";

  const verification = {
    schema: "astra-dex-liquidity-funding-transfer-safe-payload-verification-v0.1",
    generatedAt: new Date().toISOString(),
    status,
    currentApprovedMode: "restricted-mainnet-operation",
    selectedPublicPurchasePath: "dex-liquidity-pool-trading",
    verificationOnly: true,
    payloadReference: payloadRelativePath,
    payloadHash: recordedPayloadHash,
    recomputedPayloadHash,
    payloadHashVerified,
    sourceSafeAddress: payload.sourceSafeAddress,
    destinationSafeAddress: payload.destinationSafeAddress,
    transactionCount: payload.transactions?.length || 0,
    transactionChecks,
    requiredBeforeFundingTransferSubmissionApproval: {
      fundingTransferSafePayloadGenerated: true,
      payloadVerified: issues.length === 0,
      sourceSafeReviewed: true,
      destinationSafeReviewed: true,
      tokenTransferAmountsReviewed: true,
      safeSubmissionApprovalRecorded: false,
      operatorSubmissionCommandReviewed: false,
      publicStatusUpdatePrepared: false
    },
    flags: {
      fundingTransferSafePayloadVerified: issues.length === 0,
      payloadHashVerified,
      transferCalldataVerified: issues.length === 0,
      sourceBalancesVerified: issues.length === 0,
      destinationBalancesVerifiedUnchanged: issues.length === 0,
      fundingTransferPayloadGenerated: true,
      fundingTransferSafePayloadGenerated: true,
      fundingTransferSubmitted: false,
      fundingTransferExecuted: false,
      treasuryFundsMoved: false,
      globalTreasuryFundingApproved: false,
      globalTreasuryFundingExecuted: false,
      tokenApprovalPayloadGenerated: false,
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
      readOnlyVerification: true,
      submitsSafeTransaction: false,
      executesFundingTransfer: false,
      movesTreasuryFunds: false,
      executesTokenApproval: false,
      generatesLiquidityCalldata: false,
      addsLiquidity: false,
      mintsPosition: false,
      activatesBuyPage: false,
      approvesPublicTrading: false,
      approvesFullLaunch: false
    },
    issues
  };

  verification.verificationHash = sha256Json(verification);

  writeJson(verificationFile, verification);

  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-funding-transfer-safe-payload-verification-result-v0.1",
    checkedAt: verification.generatedAt,
    status,
    payloadHashVerified,
    transactionCount: verification.transactionCount,
    fundingTransferSubmitted: false,
    fundingTransferExecuted: false,
    treasuryFundsMoved: false,
    tokenApprovalExecuted: false,
    liquidityAdded: false,
    positionMinted: false,
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
