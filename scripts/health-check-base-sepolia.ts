import { network } from "hardhat";
import { formatUnits } from "viem";
import fs from "node:fs";

type HexAddress = `0x${string}`;
type Bytes32 = `0x${string}`;

function requireAddress(name: string): HexAddress {
  const value = process.env[name];

  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${name} is missing or invalid. Add export ${name}=0x... to deployments/base-sepolia.env`);
  }

  return value as HexAddress;
}

function optionalAddress(name: string): HexAddress | undefined {
  const value = process.env[name];

  if (!value) return undefined;

  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${name} is invalid: ${value}`);
  }

  return value as HexAddress;
}

function optionalBytes32(name: string): Bytes32 | undefined {
  const value = process.env[name];

  if (!value) return undefined;

  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error(`${name} is invalid. It should be 0x plus 64 hex characters.`);
  }

  return value as Bytes32;
}

function getStructField<T>(value: any, key: string, index: number): T {
  return (value[key] ?? value[index]) as T;
}

function astp(value: bigint): string {
  return `${formatUnits(value, 18)} ASTP`;
}

function boolStatus(value: boolean): string {
  return value ? "YES" : "NO";
}

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function stringifyWithBigInt(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, innerValue) => typeof innerValue === "bigint" ? innerValue.toString() : innerValue,
    2
  );
}

const tokenAddress = requireAddress("ASTRA_TOKEN");
const policyAddress = requireAddress("ASTRA_POLICY");
const vaultAddress = requireAddress("ASTRA_VAULT");
const registryAddress = requireAddress("ASTRA_SIGNAL_REGISTRY");
const controllerAddress = requireAddress("ASTRA_CONTROLLER");
const signalId = optionalBytes32("ASTRA_SIGNAL_ID");

const ecosystemWallet = optionalAddress("ASTRA_ECOSYSTEM_WALLET");
const liquidityWallet = optionalAddress("ASTRA_LIQUIDITY_WALLET");
const teamWallet = optionalAddress("ASTRA_TEAM_WALLET");
const communityWallet = optionalAddress("ASTRA_COMMUNITY_WALLET");
const advisorsWallet = optionalAddress("ASTRA_ADVISORS_WALLET");
const testRecipient = optionalAddress("ASTRA_TEST_RECIPIENT");

const { viem, networkName } = await network.create();
const publicClient = await viem.getPublicClient();
const [walletClient] = await viem.getWalletClients();

const currentWallet = walletClient.account.address;

const token = await viem.getContractAt("AstraToken", tokenAddress);
const policy = await viem.getContractAt("TreasuryPolicy", policyAddress);
const vault = await viem.getContractAt("TreasuryVault", vaultAddress);
const registry = await viem.getContractAt("SignalRegistry", registryAddress);
const controller = await viem.getContractAt("ExecutionController", controllerAddress);

const chainId = await publicClient.getChainId();

console.log("AstraTreasury Protocol — Base Sepolia Health Check");
console.log("==================================================");
console.log(`Network: ${networkName}`);
console.log(`Chain ID: ${chainId}`);
console.log(`Current wallet: ${currentWallet}`);
console.log("");

const tokenName = await token.read.name();
const tokenSymbol = await token.read.symbol();
const tokenDecimals = await token.read.decimals();
const totalSupply = await token.read.totalSupply();

console.log("Token");
console.table({
  address: tokenAddress,
  name: tokenName,
  symbol: tokenSymbol,
  decimals: Number(tokenDecimals),
  totalSupply: astp(totalSupply)
});

const walletMap = new Map<string, HexAddress>();
walletMap.set("TreasuryVault", vaultAddress);
walletMap.set("CurrentWallet", currentWallet);
if (ecosystemWallet) walletMap.set("EcosystemWallet", ecosystemWallet);
if (liquidityWallet) walletMap.set("LiquidityWallet", liquidityWallet);
if (teamWallet) walletMap.set("TeamWallet", teamWallet);
if (communityWallet) walletMap.set("CommunityWallet", communityWallet);
if (advisorsWallet) walletMap.set("AdvisorsWallet", advisorsWallet);
if (testRecipient) walletMap.set("TestRecipient", testRecipient);

const balanceRows: Record<string, string> = {};

for (const [label, address] of walletMap.entries()) {
  const balance = await token.read.balanceOf([address]);
  balanceRows[label] = `${address} | ${astp(balance)}`;
}

console.log("ASTP balances");
console.table(balanceRows);

const policyConfig = await policy.read.config();

const maxSingleTradeBps = Number(getStructField<bigint | number>(policyConfig, "maxSingleTradeBps", 0));
const maxDailyTradeBps = Number(getStructField<bigint | number>(policyConfig, "maxDailyTradeBps", 1));
const minStableReserveBps = Number(getStructField<bigint | number>(policyConfig, "minStableReserveBps", 2));
const maxMonthlyBuybackRevenueBps = Number(getStructField<bigint | number>(policyConfig, "maxMonthlyBuybackRevenueBps", 3));
const maxSlippageBps = Number(getStructField<bigint | number>(policyConfig, "maxSlippageBps", 4));
const allowBuybacks = Boolean(getStructField<boolean>(policyConfig, "allowBuybacks", 5));
const allowLiquidityActions = Boolean(getStructField<boolean>(policyConfig, "allowLiquidityActions", 6));
const allowGrants = Boolean(getStructField<boolean>(policyConfig, "allowGrants", 7));

const astpApproved = await policy.read.isApprovedAsset([tokenAddress]);
const nativeApproved = await policy.read.isApprovedAsset(["0x0000000000000000000000000000000000000000"]);

console.log("Treasury policy");
console.table({
  policyAddress,
  astpApproved: boolStatus(astpApproved),
  nativeEthApproved: boolStatus(nativeApproved),
  maxSingleTradeBps,
  maxDailyTradeBps,
  minStableReserveBps,
  maxMonthlyBuybackRevenueBps,
  maxSlippageBps,
  allowBuybacks: boolStatus(allowBuybacks),
  allowLiquidityActions: boolStatus(allowLiquidityActions),
  allowGrants: boolStatus(allowGrants)
});

const vaultPolicy = await vault.read.policy();
const controllerVault = await controller.read.vault();
const controllerPolicy = await controller.read.policy();
const controllerRegistry = await controller.read.signalRegistry();

console.log("Contract wiring");
console.table({
  vaultPolicyMatches: boolStatus(sameAddress(vaultPolicy, policyAddress)),
  controllerVaultMatches: boolStatus(sameAddress(controllerVault, vaultAddress)),
  controllerPolicyMatches: boolStatus(sameAddress(controllerPolicy, policyAddress)),
  controllerRegistryMatches: boolStatus(sameAddress(controllerRegistry, registryAddress))
});

const vaultExecutorRole = await vault.read.EXECUTOR_ROLE();
const controllerHasVaultExecutorRole = await vault.read.hasRole([vaultExecutorRole, controllerAddress]);

const controllerExecutorRole = await controller.read.EXECUTOR_ROLE();
const currentWalletHasControllerExecutorRole = await controller.read.hasRole([controllerExecutorRole, currentWallet]);

const signalerRole = await registry.read.SIGNALER_ROLE();
const currentWalletHasSignalerRole = await registry.read.hasRole([signalerRole, currentWallet]);

console.log("Roles");
console.table({
  controllerCanMoveVaultFunds: boolStatus(controllerHasVaultExecutorRole),
  currentWalletCanExecuteController: boolStatus(currentWalletHasControllerExecutorRole),
  currentWalletCanSubmitSignals: boolStatus(currentWalletHasSignalerRole)
});

const vaultPaused = await vault.read.paused();
const registryPaused = await registry.read.paused();
const controllerPaused = await controller.read.paused();

console.log("Pause status");
console.table({
  vaultPaused: boolStatus(vaultPaused),
  signalRegistryPaused: boolStatus(registryPaused),
  executionControllerPaused: boolStatus(controllerPaused)
});

let signalReport: unknown = "ASTRA_SIGNAL_ID not set; skipped signal lookup.";

if (signalId) {
  const exists = await registry.read.signalExists([signalId]);

  if (exists) {
    const signal = await registry.read.signals([signalId]);

    signalReport = {
      signalId,
      exists,
      modelVersion: String(getStructField<string>(signal, "modelVersion", 1)),
      actionType: Number(getStructField<number | bigint>(signal, "actionType", 2)),
      confidenceBps: Number(getStructField<number | bigint>(signal, "confidenceBps", 3)),
      riskBps: Number(getStructField<number | bigint>(signal, "riskBps", 4)),
      maxSizeUsd: String(getStructField<bigint>(signal, "maxSizeUsd", 5)),
      dataHash: String(getStructField<string>(signal, "dataHash", 6)),
      reasonCode: String(getStructField<string>(signal, "reasonCode", 7)),
      createdAt: String(getStructField<bigint | number>(signal, "createdAt", 8)),
      submittedBy: String(getStructField<string>(signal, "submittedBy", 9)),
      cancelled: Boolean(getStructField<boolean>(signal, "cancelled", 10))
    };
  } else {
    signalReport = {
      signalId,
      exists: false
    };
  }
}

console.log("Signal check");
console.log(stringifyWithBigInt(signalReport));

const report = {
  checkedAt: new Date().toISOString(),
  networkName,
  chainId,
  currentWallet,
  contracts: {
    token: tokenAddress,
    policy: policyAddress,
    vault: vaultAddress,
    signalRegistry: registryAddress,
    controller: controllerAddress
  },
  token: {
    name: tokenName,
    symbol: tokenSymbol,
    decimals: Number(tokenDecimals),
    totalSupply: totalSupply.toString()
  },
  policy: {
    astpApproved,
    nativeApproved,
    maxSingleTradeBps,
    maxDailyTradeBps,
    minStableReserveBps,
    maxMonthlyBuybackRevenueBps,
    maxSlippageBps,
    allowBuybacks,
    allowLiquidityActions,
    allowGrants
  },
  wiring: {
    vaultPolicyMatches: sameAddress(vaultPolicy, policyAddress),
    controllerVaultMatches: sameAddress(controllerVault, vaultAddress),
    controllerPolicyMatches: sameAddress(controllerPolicy, policyAddress),
    controllerRegistryMatches: sameAddress(controllerRegistry, registryAddress)
  },
  roles: {
    controllerHasVaultExecutorRole,
    currentWalletHasControllerExecutorRole,
    currentWalletHasSignalerRole
  },
  paused: {
    vaultPaused,
    registryPaused,
    controllerPaused
  },
  signal: signalReport
};

fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync("reports/base-sepolia-health.json", stringifyWithBigInt(report) + "\n");

console.log("");
console.log("Health report saved to reports/base-sepolia-health.json");
console.log("Health check complete.");
