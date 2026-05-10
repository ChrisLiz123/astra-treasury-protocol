import { network } from "hardhat";

function isAddress(value: string | undefined): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value ?? "");
}

function envAddress(name: string, fallback: `0x${string}`): `0x${string}` {
  const value = process.env[name];
  return isAddress(value) ? value : fallback;
}

const { viem, networkName } = await network.create();
const publicClient = await viem.getPublicClient();
const [deployer] = await viem.getWalletClients();
const admin = deployer.account.address;

console.log(`Deploying AstraTreasury Protocol to ${networkName}`);
console.log(`Admin/deployer: ${admin}`);

const ecosystemWallet = envAddress("ASTRA_ECOSYSTEM_WALLET", admin);
const liquidityWallet = envAddress("ASTRA_LIQUIDITY_WALLET", admin);
const teamWallet = envAddress("ASTRA_TEAM_WALLET", admin);
const communityWallet = envAddress("ASTRA_COMMUNITY_WALLET", admin);
const advisorsWallet = envAddress("ASTRA_ADVISORS_WALLET", admin);
const signalerWallet = envAddress("ASTRA_SIGNALER_WALLET", admin);

const policy = await viem.deployContract("TreasuryPolicy", [admin]);
console.log("TreasuryPolicy:", policy.address);

const vault = await viem.deployContract("TreasuryVault", [admin, policy.address]);
console.log("TreasuryVault:", vault.address);

const signalRegistry = await viem.deployContract("SignalRegistry", [admin]);
console.log("SignalRegistry:", signalRegistry.address);

const controller = await viem.deployContract("ExecutionController", [
  admin,
  vault.address,
  policy.address,
  signalRegistry.address
]);
console.log("ExecutionController:", controller.address);

const token = await viem.deployContract("AstraToken", [
  vault.address,
  ecosystemWallet,
  liquidityWallet,
  teamWallet,
  communityWallet,
  advisorsWallet
]);
console.log("AstraToken:", token.address);

console.log("Granting vault executor role to ExecutionController...");
const vaultExecutorRole = await vault.read.EXECUTOR_ROLE();
const vaultGrantRoleTx = await vault.write.grantRole([vaultExecutorRole, controller.address]);
await publicClient.waitForTransactionReceipt({ hash: vaultGrantRoleTx, confirmations: 1 });

console.log("Granting signaler role...");
const signalerRole = await signalRegistry.read.SIGNALER_ROLE();
const signalerGrantRoleTx = await signalRegistry.write.grantRole([signalerRole, signalerWallet]);
await publicClient.waitForTransactionReceipt({ hash: signalerGrantRoleTx, confirmations: 1 });

console.log("Approving ASTP as a treasury asset in policy...");
const approveAstpTx = await policy.write.setAssetPolicy([token.address, true, false]);
await publicClient.waitForTransactionReceipt({ hash: approveAstpTx, confirmations: 1 });

console.log("Deployment complete.");
console.table({
  token: token.address,
  policy: policy.address,
  vault: vault.address,
  signalRegistry: signalRegistry.address,
  controller: controller.address,
  admin,
  ecosystemWallet,
  liquidityWallet,
  teamWallet,
  communityWallet,
  advisorsWallet,
  signalerWallet
});
