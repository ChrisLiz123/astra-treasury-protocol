import { network } from "hardhat";
import { createHash } from "node:crypto";

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
    throw new Error(`${name} is missing or invalid. It should look like 0x plus 64 hex characters.`);
  }

  return value as Bytes32;
}

function getStructField<T>(value: any, key: string, index: number): T {
  return (value[key] ?? value[index]) as T;
}

function makeActionId(payload: unknown): Bytes32 {
  return ("0x" + createHash("sha256").update(JSON.stringify(payload)).digest("hex")) as Bytes32;
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
const registryAddress = requireAddress("ASTRA_SIGNAL_REGISTRY");
const controllerAddress = requireAddress("ASTRA_CONTROLLER");
const signalId = requireBytes32("ASTRA_SIGNAL_ID");

const { viem, networkName } = await network.create();
const [walletClient] = await viem.getWalletClients();

const executor = walletClient.account.address;
const recipient = optionalAddress("ASTRA_LIQUIDITY_WALLET", executor);

console.log(`Network: ${networkName}`);
console.log(`Executor wallet: ${executor}`);
console.log(`SignalRegistry: ${registryAddress}`);
console.log(`ExecutionController: ${controllerAddress}`);
console.log(`ASTP token: ${tokenAddress}`);
console.log(`Dry-run recipient: ${recipient}`);
console.log(`Signal ID: ${signalId}`);

const signalRegistry = await viem.getContractAt("SignalRegistry", registryAddress);
const policy = await viem.getContractAt("TreasuryPolicy", policyAddress);
const controller = await viem.getContractAt("ExecutionController", controllerAddress);

const exists = await signalRegistry.read.signalExists([signalId]);

if (!exists) {
  throw new Error(`Signal ${signalId} does not exist on-chain.`);
}

const signal = await signalRegistry.read.signals([signalId]);

const actionType = Number(getStructField<number | bigint>(signal, "actionType", 2));
const modelVersion = String(getStructField<string>(signal, "modelVersion", 1));
const confidenceBps = Number(getStructField<number | bigint>(signal, "confidenceBps", 3));
const riskBps = Number(getStructField<number | bigint>(signal, "riskBps", 4));
const reasonCode = String(getStructField<string>(signal, "reasonCode", 7));

console.log("Loaded on-chain AI signal:");
console.table({
  modelVersion,
  actionType,
  confidenceBps,
  riskBps,
  reasonCode
});

const actionId = makeActionId({
  signalId,
  actionType,
  tokenAddress,
  recipient,
  timestampBucket: Math.floor(Date.now() / 60_000)
});

const proposal = {
  actionId,
  signalId,
  actionType,
  asset: tokenAddress,
  recipient,
  amount: 1n * UNIT,
  proposedUsdValue: usd18(5_000n),
  treasuryUsdValue: usd18(1_000_000n),
  dailyUsdUsed: usd18(0n),
  stableReserveUsdValue: usd18(480_000n),
  slippageBps: 80,
  usesRealizedRevenue: actionType === 3,
  memo: "DRY_RUN_ONLY: AI signal converted into policy-checked treasury proposal. No funds moved."
};

console.log("Prepared dry-run proposal:");
console.log(stringifyWithBigInt(proposal));

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
  throw new Error(`Policy rejected proposal: ${reason}`);
}

console.log("Running ExecutionController simulation only...");

await controller.simulate.executeTokenTransfer([proposal]);

console.log("Dry-run passed.");
console.log("No transaction was sent. No treasury funds were moved.");
console.log(`Action ID preview: ${actionId}`);
