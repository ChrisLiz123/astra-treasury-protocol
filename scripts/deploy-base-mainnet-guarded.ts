import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

type HexAddress = `0x${string}`;

const configPath = "configs/mainnet-production.config.json";
const outDir = "reports/mainnet-deployment";
const outFile = path.join(outDir, "mainnet-deployment-v1.json");

function requireAddress(value: string, label: string): HexAddress {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value || "")) {
    throw new Error(`${label} must be a valid address.`);
  }

  return value as HexAddress;
}

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

if (process.env.ASTRA_MAINNET_DEPLOYMENT_APPROVED !== "YES") {
  throw new Error("Deployment blocked. Set ASTRA_MAINNET_DEPLOYMENT_APPROVED=YES only after final go/no-go.");
}

if (!fs.existsSync(configPath)) {
  throw new Error(`Missing private config: ${configPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

if (config.network?.chainId !== 8453) {
  throw new Error("Deployment blocked. Config is not Base Mainnet chainId 8453.");
}

if (config.controls?.mainnetDeploymentApproved !== true) {
  throw new Error("Deployment blocked. config.controls.mainnetDeploymentApproved is not true.");
}

if (config.controls?.auditCleared !== true) {
  throw new Error("Deployment blocked. Audit is not marked cleared.");
}

if (config.controls?.legalCleared !== true) {
  throw new Error("Deployment blocked. Legal is not marked cleared.");
}

if (config.controls?.publicSaleApproved === true) {
  throw new Error("Deployment blocked. Public sale approval must not be bundled with deployment.");
}

if (config.controls?.realTreasuryFundingApproved === true) {
  throw new Error("Deployment blocked. Real treasury funding must not be bundled with deployment.");
}

const governanceSafe = requireAddress(config.safes.governanceSafe, "governanceSafe");
const ecosystemWallet = requireAddress(config.allocationWallets.ecosystemWallet, "ecosystemWallet");
const liquidityWallet = requireAddress(config.allocationWallets.liquidityWallet, "liquidityWallet");
const teamWallet = requireAddress(config.allocationWallets.teamWallet, "teamWallet");
const communityWallet = requireAddress(config.allocationWallets.communityWallet, "communityWallet");
const advisorsWallet = requireAddress(config.allocationWallets.advisorsWallet, "advisorsWallet");
const expectedDeployer = requireAddress(config.deployer.address, "deployer.address");

const { viem, networkName } = await network.create();
const publicClient = await viem.getPublicClient();
const [walletClient] = await viem.getWalletClients();

const deployer = walletClient.account.address;
const chainId = await publicClient.getChainId();

if (chainId !== 8453) {
  throw new Error(`Deployment blocked. Connected chainId is ${chainId}, expected 8453.`);
}

if (!sameAddress(deployer, expectedDeployer)) {
  throw new Error(`Deployment blocked. Deployer ${deployer} does not match config deployer ${expectedDeployer}.`);
}

fs.mkdirSync(outDir, { recursive: true });

console.log("AstraTreasury guarded Base Mainnet deployment");
console.log("============================================");
console.log(`Network: ${networkName}`);
console.log(`Chain ID: ${chainId}`);
console.log(`Deployer: ${deployer}`);
console.log(`Governance Safe: ${governanceSafe}`);
console.log("");
console.log("Final guard passed. Starting deployment...");

const policy = await viem.deployContract("TreasuryPolicy", [governanceSafe]);
console.log(`TreasuryPolicy: ${policy.address}`);

const vault = await viem.deployContract("TreasuryVault", [governanceSafe, policy.address]);
console.log(`TreasuryVault: ${vault.address}`);

const registry = await viem.deployContract("SignalRegistry", [governanceSafe]);
console.log(`SignalRegistry: ${registry.address}`);

const controller = await viem.deployContract("ExecutionController", [
  governanceSafe,
  vault.address,
  policy.address,
  registry.address
]);
console.log(`ExecutionController: ${controller.address}`);

const token = await viem.deployContract("AstraToken", [
  vault.address,
  ecosystemWallet,
  liquidityWallet,
  teamWallet,
  communityWallet,
  advisorsWallet
]);
console.log(`AstraToken: ${token.address}`);

const report = {
  schema: "astra-mainnet-deployment-v1",
  deployedAt: new Date().toISOString(),
  networkName,
  chainId,
  deployer,
  governanceSafe,
  contracts: {
    treasuryPolicy: policy.address,
    treasuryVault: vault.address,
    signalRegistry: registry.address,
    executionController: controller.address,
    astraToken: token.address
  },
  allocationWallets: {
    ecosystemWallet,
    liquidityWallet,
    teamWallet,
    communityWallet,
    advisorsWallet
  },
  nextRequiredSafeActions: [
    "Governance Safe: TreasuryPolicy.setAssetPolicy(ASTRA_TOKEN, true, false)",
    "Governance Safe: TreasuryVault.grantRole(EXECUTOR_ROLE, ExecutionController)",
    "Governance Safe: SignalRegistry.grantRole(SIGNALER_ROLE, Signaler Safe)",
    "Governance Safe: ExecutionController.grantRole(EXECUTOR_ROLE, Executor Safe)"
  ],
  warning:
    "Deployment does not fund treasury, does not start public sale, and does not approve real treasury operations."
};

fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + "\n");

console.log("");
console.log(`Deployment report written: ${outFile}`);
console.log("Next required actions must be executed by Governance Safe, not deployer.");
