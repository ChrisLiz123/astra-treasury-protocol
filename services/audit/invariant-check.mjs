import fs from "node:fs";
import path from "node:path";
import {
  createPublicClient,
  formatUnits,
  getAddress,
  http as viemHttp,
  parseAbi
} from "viem";
import { baseSepolia } from "viem/chains";

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, "deployments", "base-sepolia.env");
const outDir = path.join(projectRoot, "reports", "audit");
const latestFile = path.join(outDir, "latest-invariant-check.json");

fs.mkdirSync(outDir, { recursive: true });

loadEnvFile(envPath);

const RPC_URL =
  process.env.AUDIT_RPC_URL ||
  process.env.DASHBOARD_RPC_URL ||
  process.env.BASE_SEPOLIA_RPC_URL ||
  "https://base-sepolia-rpc.publicnode.com";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const requiredAddresses = {
  ASTRA_TOKEN: requireAddress("ASTRA_TOKEN"),
  ASTRA_POLICY: requireAddress("ASTRA_POLICY"),
  ASTRA_VAULT: requireAddress("ASTRA_VAULT"),
  ASTRA_SIGNAL_REGISTRY: requireAddress("ASTRA_SIGNAL_REGISTRY"),
  ASTRA_CONTROLLER: requireAddress("ASTRA_CONTROLLER")
};

const optionalWallets = {
  ASTRA_ECOSYSTEM_WALLET: optionalAddress("ASTRA_ECOSYSTEM_WALLET"),
  ASTRA_LIQUIDITY_WALLET: optionalAddress("ASTRA_LIQUIDITY_WALLET"),
  ASTRA_TEAM_WALLET: optionalAddress("ASTRA_TEAM_WALLET"),
  ASTRA_COMMUNITY_WALLET: optionalAddress("ASTRA_COMMUNITY_WALLET"),
  ASTRA_ADVISORS_WALLET: optionalAddress("ASTRA_ADVISORS_WALLET")
};

const client = createPublicClient({
  chain: baseSepolia,
  transport: viemHttp(RPC_URL)
});

const tokenAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
]);

const policyAbi = parseAbi([
  "function config() view returns (uint16 maxSingleTradeBps, uint16 maxDailyTradeBps, uint16 minStableReserveBps, uint16 maxMonthlyBuybackRevenueBps, uint16 maxSlippageBps, bool allowBuybacks, bool allowLiquidityActions, bool allowGrants)",
  "function isApprovedAsset(address asset) view returns (bool)",
  "function validateAction(uint8 actionType, address asset, uint256 proposedUsdValue, uint256 treasuryUsdValue, uint256 dailyUsdUsed, uint256 stableReserveUsdValue, uint16 slippageBps, bool usesRealizedRevenue) view returns (bool allowed, string reason)"
]);

const vaultAbi = parseAbi([
  "function policy() view returns (address)",
  "function paused() view returns (bool)",
  "function EXECUTOR_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)"
]);

const registryAbi = parseAbi([
  "function paused() view returns (bool)"
]);

const controllerAbi = parseAbi([
  "function vault() view returns (address)",
  "function policy() view returns (address)",
  "function signalRegistry() view returns (address)",
  "function paused() view returns (bool)"
]);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;

    const key = match[1];
    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ||= value;
  }
}

function requireAddress(name) {
  const value = process.env[name];

  if (!/^0x[a-fA-F0-9]{40}$/.test(value || "")) {
    throw new Error(`${name} is missing or invalid in deployments/base-sepolia.env`);
  }

  return getAddress(value);
}

function optionalAddress(name) {
  const value = process.env[name];

  if (!value) return null;

  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${name} is invalid in deployments/base-sepolia.env`);
  }

  return getAddress(value);
}

function sameAddress(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function field(value, key, index) {
  return value?.[key] ?? value?.[index];
}

function bigintJson(_key, value) {
  return typeof value === "bigint" ? value.toString() : value;
}

function usd18(value) {
  return BigInt(value) * 10n ** 18n;
}

function tokenRead(functionName, args = []) {
  return client.readContract({
    address: requiredAddresses.ASTRA_TOKEN,
    abi: tokenAbi,
    functionName,
    args
  });
}

function policyRead(functionName, args = []) {
  return client.readContract({
    address: requiredAddresses.ASTRA_POLICY,
    abi: policyAbi,
    functionName,
    args
  });
}

function vaultRead(functionName, args = []) {
  return client.readContract({
    address: requiredAddresses.ASTRA_VAULT,
    abi: vaultAbi,
    functionName,
    args
  });
}

function registryRead(functionName, args = []) {
  return client.readContract({
    address: requiredAddresses.ASTRA_SIGNAL_REGISTRY,
    abi: registryAbi,
    functionName,
    args
  });
}

function controllerRead(functionName, args = []) {
  return client.readContract({
    address: requiredAddresses.ASTRA_CONTROLLER,
    abi: controllerAbi,
    functionName,
    args
  });
}

function record(checks, name, pass, details = {}) {
  checks.push({
    name,
    pass: Boolean(pass),
    details
  });
}

async function validatePolicyCase(args) {
  const result = await policyRead("validateAction", args);

  return {
    allowed: Boolean(result[0]),
    reason: String(result[1])
  };
}

async function main() {
  const checks = [];
  const warnings = [];

  const chainId = await client.getChainId();

  record(checks, "chain id is Base Sepolia", chainId === 84532, { chainId });

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    tokenRead("name"),
    tokenRead("symbol"),
    tokenRead("decimals"),
    tokenRead("totalSupply")
  ]);

  record(checks, "token name", name === "AstraTreasury Token", { name });
  record(checks, "token symbol", symbol === "ASTP", { symbol });
  record(checks, "token decimals", Number(decimals) === 18, { decimals: Number(decimals) });
  record(
    checks,
    "token supply is 1,000,000,000 ASTP",
    totalSupply === 1_000_000_000n * 10n ** 18n,
    {
      totalSupplyRaw: totalSupply,
      totalSupplyFormatted: formatUnits(totalSupply, 18)
    }
  );

  const vaultBalance = await tokenRead("balanceOf", [requiredAddresses.ASTRA_VAULT]);

  record(checks, "vault ASTP balance does not exceed total supply", vaultBalance <= totalSupply, {
    vaultBalanceRaw: vaultBalance,
    vaultBalanceFormatted: formatUnits(vaultBalance, 18)
  });

  const walletBalances = {};
  const uniqueKnownAddresses = new Map();

  function trackKnownAddress(label, address) {
    const key = String(address).toLowerCase();

    if (!uniqueKnownAddresses.has(key)) {
      uniqueKnownAddresses.set(key, {
        address,
        labels: [label],
        balance: null,
        formatted: null
      });
      return;
    }

    uniqueKnownAddresses.get(key).labels.push(label);
  }

  trackKnownAddress("TreasuryVault", requiredAddresses.ASTRA_VAULT);

  for (const [label, address] of Object.entries(optionalWallets)) {
    if (!address) continue;
    trackKnownAddress(label, address);
  }

  let knownBalanceSum = 0n;
  const duplicateKnownAddresses = [];

  for (const entry of uniqueKnownAddresses.values()) {
    const balance = await tokenRead("balanceOf", [entry.address]);
    entry.balance = balance;
    entry.formatted = formatUnits(balance, 18);

    knownBalanceSum += balance;

    if (entry.labels.length > 1) {
      duplicateKnownAddresses.push({
        address: entry.address,
        labels: entry.labels
      });
    }

    for (const label of entry.labels) {
      walletBalances[label] = {
        address: entry.address,
        balance,
        formatted: entry.formatted,
        countedOnce: true,
        labelsSharingAddress: entry.labels
      };
    }
  }

  if (duplicateKnownAddresses.length > 0) {
    warnings.push(
      "Some allocation labels share the same wallet address. Unique-address balance sum was used to avoid double-counting."
    );
  }

  record(checks, "unique known allocation balances do not exceed total supply", knownBalanceSum <= totalSupply, {
    uniqueKnownAddressCount: uniqueKnownAddresses.size,
    duplicateKnownAddresses,
    knownBalanceSumRaw: knownBalanceSum,
    knownBalanceSumFormatted: formatUnits(knownBalanceSum, 18),
    totalSupplyFormatted: formatUnits(totalSupply, 18)
  });

  const [vaultPolicy, controllerVault, controllerPolicy, controllerRegistry] = await Promise.all([
    vaultRead("policy"),
    controllerRead("vault"),
    controllerRead("policy"),
    controllerRead("signalRegistry")
  ]);

  record(checks, "vault policy points to TreasuryPolicy", sameAddress(vaultPolicy, requiredAddresses.ASTRA_POLICY), {
    vaultPolicy,
    expected: requiredAddresses.ASTRA_POLICY
  });

  record(checks, "controller vault points to TreasuryVault", sameAddress(controllerVault, requiredAddresses.ASTRA_VAULT), {
    controllerVault,
    expected: requiredAddresses.ASTRA_VAULT
  });

  record(checks, "controller policy points to TreasuryPolicy", sameAddress(controllerPolicy, requiredAddresses.ASTRA_POLICY), {
    controllerPolicy,
    expected: requiredAddresses.ASTRA_POLICY
  });

  record(
    checks,
    "controller registry points to SignalRegistry",
    sameAddress(controllerRegistry, requiredAddresses.ASTRA_SIGNAL_REGISTRY),
    {
      controllerRegistry,
      expected: requiredAddresses.ASTRA_SIGNAL_REGISTRY
    }
  );

  const vaultExecutorRole = await vaultRead("EXECUTOR_ROLE");
  const controllerHasVaultExecutorRole = await vaultRead("hasRole", [
    vaultExecutorRole,
    requiredAddresses.ASTRA_CONTROLLER
  ]);

  record(checks, "controller has vault executor role", controllerHasVaultExecutorRole, {
    controller: requiredAddresses.ASTRA_CONTROLLER
  });

  const [vaultPaused, registryPaused, controllerPaused] = await Promise.all([
    vaultRead("paused"),
    registryRead("paused"),
    controllerRead("paused")
  ]);

  record(checks, "vault is not paused", !vaultPaused, { paused: vaultPaused });
  record(checks, "signal registry is not paused", !registryPaused, { paused: registryPaused });
  record(checks, "execution controller is not paused", !controllerPaused, { paused: controllerPaused });

  const cfg = await policyRead("config");
  const config = {
    maxSingleTradeBps: Number(field(cfg, "maxSingleTradeBps", 0)),
    maxDailyTradeBps: Number(field(cfg, "maxDailyTradeBps", 1)),
    minStableReserveBps: Number(field(cfg, "minStableReserveBps", 2)),
    maxMonthlyBuybackRevenueBps: Number(field(cfg, "maxMonthlyBuybackRevenueBps", 3)),
    maxSlippageBps: Number(field(cfg, "maxSlippageBps", 4)),
    allowBuybacks: Boolean(field(cfg, "allowBuybacks", 5)),
    allowLiquidityActions: Boolean(field(cfg, "allowLiquidityActions", 6)),
    allowGrants: Boolean(field(cfg, "allowGrants", 7))
  };

  record(checks, "max slippage is conservative", config.maxSlippageBps <= 100, config);
  record(checks, "max single trade is conservative", config.maxSingleTradeBps <= 50, config);
  record(checks, "max daily trade exposure is conservative", config.maxDailyTradeBps <= 200, config);
  record(checks, "minimum stable reserve is at least 40%", config.minStableReserveBps >= 4000, config);

  const astpApproved = await policyRead("isApprovedAsset", [requiredAddresses.ASTRA_TOKEN]);
  const nativeApproved = await policyRead("isApprovedAsset", [ZERO_ADDRESS]);

  record(checks, "ASTP is an approved policy asset", astpApproved, {
    token: requiredAddresses.ASTRA_TOKEN
  });

  record(checks, "native ETH approval status recorded", typeof nativeApproved === "boolean", {
    nativeApproved
  });

  const allowedLiquidity = await validatePolicyCase([
    1,
    requiredAddresses.ASTRA_TOKEN,
    usd18(1),
    usd18(1_000_000),
    usd18(0),
    usd18(480_000),
    Math.min(config.maxSlippageBps, 80),
    false
  ]);

  record(checks, "policy allows tiny ADD_LIQUIDITY proposal", allowedLiquidity.allowed, allowedLiquidity);

  const rejectedUnapprovedAsset = await validatePolicyCase([
    1,
    "0x000000000000000000000000000000000000dEaD",
    usd18(1),
    usd18(1_000_000),
    usd18(0),
    usd18(480_000),
    Math.min(config.maxSlippageBps, 80),
    false
  ]);

  record(checks, "policy rejects unapproved asset", !rejectedUnapprovedAsset.allowed, rejectedUnapprovedAsset);

  const rejectedSlippage = await validatePolicyCase([
    1,
    requiredAddresses.ASTRA_TOKEN,
    usd18(1),
    usd18(1_000_000),
    usd18(0),
    usd18(480_000),
    config.maxSlippageBps + 1,
    false
  ]);

  record(checks, "policy rejects slippage above max", !rejectedSlippage.allowed, rejectedSlippage);

  const rejectedTradeTooLarge = await validatePolicyCase([
    1,
    requiredAddresses.ASTRA_TOKEN,
    usd18(10_000),
    usd18(1_000_000),
    usd18(0),
    usd18(480_000),
    Math.min(config.maxSlippageBps, 80),
    false
  ]);

  record(checks, "policy rejects oversized trade", !rejectedTradeTooLarge.allowed, rejectedTradeTooLarge);

  const rejectedLowStableReserve = await validatePolicyCase([
    1,
    requiredAddresses.ASTRA_TOKEN,
    usd18(1),
    usd18(1_000_000),
    usd18(0),
    usd18(100_000),
    Math.min(config.maxSlippageBps, 80),
    false
  ]);

  record(checks, "policy rejects low stable reserve", !rejectedLowStableReserve.allowed, rejectedLowStableReserve);

  const fuzzRuns = Number(process.env.AUDIT_POLICY_FUZZ_RUNS || "100");
  const fuzzResults = [];

  console.log(`Running ${fuzzRuns} randomized policy invariant cases...`);

  for (let i = 0; i < fuzzRuns; i++) {
    if (i > 0 && i % 25 === 0) {
      console.log(`Policy invariant progress: ${i}/${fuzzRuns}`);
    }
    const proposedUsd = 1 + Math.floor(Math.random() * 20_000);
    const treasuryUsd = 1_000_000;
    const dailyUsedUsd = Math.floor(Math.random() * 25_000);
    const stableReserveUsd = Math.floor(Math.random() * 1_000_000);
    const slippageBps = Math.floor(Math.random() * 500);

    const result = await validatePolicyCase([
      1,
      requiredAddresses.ASTRA_TOKEN,
      usd18(proposedUsd),
      usd18(treasuryUsd),
      usd18(dailyUsedUsd),
      usd18(stableReserveUsd),
      slippageBps,
      false
    ]);

    const shouldReject =
      slippageBps > config.maxSlippageBps ||
      stableReserveUsd < Math.floor((treasuryUsd * config.minStableReserveBps) / 10_000) ||
      proposedUsd > Math.floor((treasuryUsd * config.maxSingleTradeBps) / 10_000) ||
      dailyUsedUsd + proposedUsd > Math.floor((treasuryUsd * config.maxDailyTradeBps) / 10_000);

    if (shouldReject && result.allowed) {
      fuzzResults.push({
        i,
        failure: "policy allowed case expected to reject",
        proposedUsd,
        treasuryUsd,
        dailyUsedUsd,
        stableReserveUsd,
        slippageBps,
        result
      });
    }
  }

  record(checks, "fuzz-style policy rejection invariants", fuzzResults.length === 0, {
    runs: fuzzRuns,
    failures: fuzzResults.slice(0, 10)
  });

  if (fuzzResults.length > 0) {
    warnings.push("One or more randomized policy cases behaved unexpectedly.");
  }

  const failed = checks.filter((check) => !check.pass);

  const report = {
    schema: "astra-audit-invariant-report-v0.1",
    generatedAt: new Date().toISOString(),
    network: "Base Sepolia",
    chainId,
    rpcUrl: RPC_URL,
    status: failed.length === 0 ? "PASS" : "FAIL",
    summary: {
      totalChecks: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      warnings: warnings.length
    },
    addresses: requiredAddresses,
    optionalWallets,
    token: {
      name,
      symbol,
      decimals: Number(decimals),
      totalSupplyRaw: totalSupply,
      totalSupplyFormatted: formatUnits(totalSupply, 18),
      vaultBalanceRaw: vaultBalance,
      vaultBalanceFormatted: formatUnits(vaultBalance, 18),
      knownBalanceSumRaw: knownBalanceSum,
      knownBalanceSumFormatted: formatUnits(knownBalanceSum, 18),
      walletBalances
    },
    policyConfig: config,
    warnings,
    checks
  };

  fs.writeFileSync(latestFile, JSON.stringify(report, bigintJson, 2) + "\n");

  console.log("AstraTreasury Audit Invariant Check");
  console.log("===================================");
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.totalChecks} passed`);
  console.log(`Report: ${latestFile}`);

  if (failed.length > 0) {
    console.log("");
    console.log("Failed checks:");
    console.table(
      failed.map((check) => ({
        name: check.name,
        details: JSON.stringify(check.details, bigintJson)
      }))
    );

    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
