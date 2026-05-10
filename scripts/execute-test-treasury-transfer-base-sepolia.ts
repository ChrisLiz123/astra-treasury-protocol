import { network } from "hardhat";
import { randomBytes } from "node:crypto";
import { formatUnits } from "viem";

type HexAddress = `0x${string}`;
type Bytes32 = `0x${string}`;

const UNIT = 10n ** 18n;

function usd18(wholeUsd: bigint): bigint {
  return wholeUsd * UNIT;
}

function requireAddress(name: string): HexAddress {
  const value = process.env[name];

  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${name} is missing or invalid. Add export ${name}=0x... to deployments/base-sepolia.env`);
  }

  return value as HexAddress;
}

function optionalAddress(name: string, fallback: HexAddress): HexAddress {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${name} is invalid: ${value}`);
  }

  return value as HexAddress;
}

function requireBytes32(name: string): Bytes32 {
  const value = process.env[name];

  if (!value || !/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error(`${name} is missing or invalid. It should be 0x plus 64 hex characters.`);
  }

  return value as Bytes32;
}

function getStructField<T>(value: any, key: string, index: number): T {
  return (value[key] ?? value[index]) as T;
}

function makeActionId(): Bytes32 {
  return ("0x" + randomBytes(32).toString("hex")) as Bytes32;
}

function printBalance(label: string, balance: bigint): void {
  console.log(`${label}: ${formatUnits(balance, 18)} ASTP`);
}

const tokenAddress = requireAddress("ASTRA_TOKEN");
const policyAddress = requireAddress("ASTRA_POLICY");
const vaultAddress = requireAddress("ASTRA_VAULT");
const registryAddress = requireAddress("ASTRA_SIGNAL_REGISTRY");
const controllerAddress = requireAddress("ASTRA_CONTROLLER");
const signalId = requireBytes32("ASTRA_SIGNAL_ID");

const { viem, networkName } = await network.create();
const publicClient = await viem.getPublicClient();
const [walletClient] = await viem.getWalletClients();

const executor = walletClient.account.address;
const recipient = optionalAddress("ASTRA_TEST_RECIPIENT", optionalAddress("ASTRA_LIQUIDITY_WALLET", executor));

console.log(`Network: ${networkName}`);
console.log(`Executor wallet: ${executor}`);
console.log(`Recipient wallet: ${recipient}`);
console.log(`Token: ${tokenAddress}`);
console.log(`Vault: ${vaultAddress}`);
console.log(`Controller: ${controllerAddress}`);
console.log(`Signal ID: ${signalId}`);

const token = await viem.getContractAt("AstraToken", tokenAddress);
const vault = await viem.getContractAt("TreasuryVault", vaultAddress);
const policy = await viem.getContractAt("TreasuryPolicy", policyAddress);
const registry = await viem.getContractAt("SignalRegistry", registryAddress);
const controller = await viem.getContractAt("ExecutionController", controllerAddress);

const executorRole = await controller.read.EXECUTOR_ROLE();
const executorCanExecute = await controller.read.hasRole([executorRole, executor]);

if (!executorCanExecute) {
  throw new Error(`Executor wallet ${executor} does not have EXECUTOR_ROLE on ExecutionController.`);
}

const vaultExecutorRole = await vault.read.EXECUTOR_ROLE();
const controllerCanMoveVaultFunds = await vault.read.hasRole([vaultExecutorRole, controllerAddress]);

if (!controllerCanMoveVaultFunds) {
  throw new Error(`ExecutionController ${controllerAddress} does not have EXECUTOR_ROLE on TreasuryVault.`);
}

const signalExists = await registry.read.signalExists([signalId]);

if (!signalExists) {
  throw new Error(`Signal ${signalId} does not exist on-chain.`);
}

const signal = await registry.read.signals([signalId]);

const actionType = Number(getStructField<number | bigint>(signal, "actionType", 2));
const modelVersion = String(getStructField<string>(signal, "modelVersion", 1));
const confidenceBps = Number(getStructField<number | bigint>(signal, "confidenceBps", 3));
const riskBps = Number(getStructField<number | bigint>(signal, "riskBps", 4));
const reasonCode = String(getStructField<string>(signal, "reasonCode", 7));
const cancelled = Boolean(getStructField<boolean>(signal, "cancelled", 10));

console.log("Loaded signal:");
console.table({
  modelVersion,
  actionType,
  confidenceBps,
  riskBps,
  reasonCode,
  cancelled
});

if (cancelled) {
  throw new Error("Signal is cancelled. Refusing to execute.");
}

if (actionType !== 1) {
  throw new Error(`This test execution only supports ADD_LIQUIDITY actionType 1. Signal actionType was ${actionType}.`);
}

const amount = 1n * UNIT;

const vaultBalanceBefore = await token.read.balanceOf([vaultAddress]);
const recipientBalanceBefore = await token.read.balanceOf([recipient]);

console.log("Balances before:");
printBalance("Vault", vaultBalanceBefore);
printBalance("Recipient", recipientBalanceBefore);

if (vaultBalanceBefore < amount) {
  throw new Error("Vault does not have enough ASTP for the test transfer.");
}

const proposal = {
  actionId: makeActionId(),
  signalId,
  actionType,
  asset: tokenAddress,
  recipient,
  amount,
  proposedUsdValue: usd18(1n),
  treasuryUsdValue: usd18(1_000_000n),
  dailyUsdUsed: usd18(0n),
  stableReserveUsdValue: usd18(480_000n),
  slippageBps: 80,
  usesRealizedRevenue: false,
  memo: "TESTNET_ONLY: first tiny AstraTreasury vault transfer of 1 ASTP."
};

const [allowed, reason] = await policy.read.validateAction([
  proposal.actionType,
  proposal.asset,
  proposal.proposedUsdValue,
  proposal.treasuryUsdValue,
  proposal.dailyUsdUsed,
  proposal.stableReserveUsdValue,
  proposal.slippageBps,
  proposal.usesRealizedRevenue
]);

console.log("TreasuryPolicy result:");
console.table({
  allowed,
  reason
});

if (!allowed) {
  throw new Error(`Policy rejected test transfer: ${reason}`);
}

console.log("Simulating ExecutionController transaction before sending...");
await controller.simulate.executeTokenTransfer([proposal]);

console.log("Simulation passed. Sending real Base Sepolia transaction...");

const txHash = await controller.write.executeTokenTransfer([proposal]);

console.log(`Transaction sent: ${txHash}`);

const receipt = await publicClient.waitForTransactionReceipt({
  hash: txHash,
  confirmations: 1
});

console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

const vaultBalanceAfter = await token.read.balanceOf([vaultAddress]);
const recipientBalanceAfter = await token.read.balanceOf([recipient]);

console.log("Balances after:");
printBalance("Vault", vaultBalanceAfter);
printBalance("Recipient", recipientBalanceAfter);

console.log("Balance changes:");
printBalance("Vault delta", vaultBalanceAfter - vaultBalanceBefore);
printBalance("Recipient delta", recipientBalanceAfter - recipientBalanceBefore);

console.log("Done. 1 ASTP was moved on Base Sepolia testnet only.");
