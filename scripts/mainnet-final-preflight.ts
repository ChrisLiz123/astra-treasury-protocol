import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";
import { formatEther } from "viem";

type HexAddress = `0x${string}`;

const configPath = "configs/mainnet-production.config.json";
const outDir = "reports/mainnet-preflight";
const outFile = path.join(outDir, "mainnet-final-preflight.json");

fs.mkdirSync(outDir, { recursive: true });

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function sameAddress(a: string, b: string): boolean {
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function addIssue(issues: Array<{ path: string; message: string }>, path: string, message: string): void {
  issues.push({ path, message });
}

if (!fs.existsSync(configPath)) {
  throw new Error(`Missing private config: ${configPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const issues: Array<{ path: string; message: string }> = [];
const warnings: Array<{ path: string; message: string }> = [];

if (config.network?.chainId !== 8453) {
  addIssue(issues, "network.chainId", "Expected Base Mainnet chainId 8453.");
}

if (!config.rpc?.primaryProvider || config.rpc.primaryProvider === "TBD") {
  addIssue(issues, "rpc.primaryProvider", "Primary provider missing.");
}

if (!config.rpc?.backupProvider || config.rpc.backupProvider === "TBD") {
  addIssue(issues, "rpc.backupProvider", "Backup provider missing.");
}

for (const [key, value] of Object.entries(config.safes || {})) {
  if (!isAddress(String(value))) {
    addIssue(issues, `safes.${key}`, "Must be a valid Safe address.");
  }
}

for (const [key, value] of Object.entries(config.allocationWallets || {})) {
  if (!isAddress(String(value))) {
    addIssue(issues, `allocationWallets.${key}`, "Must be a valid allocation wallet/Safe address.");
  }
}

if (!isAddress(String(config.deployer?.address))) {
  addIssue(issues, "deployer.address", "Must be a valid deployer address.");
}

if (config.controls?.auditCleared !== true) {
  addIssue(issues, "controls.auditCleared", "Audit must be cleared.");
}

if (config.controls?.legalCleared !== true) {
  addIssue(issues, "controls.legalCleared", "Legal must be cleared.");
}

if (config.controls?.publicSaleApproved === true) {
  addIssue(issues, "controls.publicSaleApproved", "Public sale approval must not be bundled with deployment.");
}

if (config.controls?.realTreasuryFundingApproved === true) {
  addIssue(issues, "controls.realTreasuryFundingApproved", "Real treasury funding must not be bundled with deployment.");
}

const requireApproval = process.env.ASTRA_REQUIRE_MAINNET_APPROVAL === "YES";

if (requireApproval && config.controls?.mainnetDeploymentApproved !== true) {
  addIssue(issues, "controls.mainnetDeploymentApproved", "Deployment approval is required for this preflight mode.");
}

if (!requireApproval && config.controls?.mainnetDeploymentApproved === true) {
  warnings.push({
    path: "controls.mainnetDeploymentApproved",
    message: "Deployment approval is already true. Reset it if not deploying in this session."
  });
}

const { viem, networkName } = await network.create();
const publicClient = await viem.getPublicClient();
const [walletClient] = await viem.getWalletClients();

const chainId = await publicClient.getChainId();
const deployer = walletClient.account.address;
const balanceWei = await publicClient.getBalance({ address: deployer });

if (chainId !== 8453) {
  addIssue(issues, "connected.chainId", `Connected chainId is ${chainId}, expected 8453.`);
}

if (!sameAddress(deployer, config.deployer.address)) {
  addIssue(
    issues,
    "connected.deployer",
    `Connected deployer ${deployer} does not match config deployer ${config.deployer.address}.`
  );
}

if (balanceWei <= 0n) {
  addIssue(issues, "connected.deployerBalance", "Deployer has zero ETH for gas.");
}

if (balanceWei > 0n && balanceWei < 10_000_000_000_000_000n) {
  warnings.push({
    path: "connected.deployerBalance",
    message: "Deployer balance is less than 0.01 ETH. Confirm this is enough for deployment gas."
  });
}

const report = {
  schema: "astra-mainnet-final-preflight-v0.1",
  checkedAt: new Date().toISOString(),
  mode: requireApproval ? "REQUIRE_APPROVAL" : "PRE_APPROVAL_REVIEW",
  status: issues.length === 0 ? "PASS" : "FAIL",
  networkName,
  connected: {
    chainId,
    deployer,
    deployerBalanceWei: balanceWei.toString(),
    deployerBalanceEth: formatEther(balanceWei)
  },
  configSummary: {
    primaryProvider: config.rpc?.primaryProvider,
    backupProvider: config.rpc?.backupProvider,
    governanceSafe: config.safes?.governanceSafe,
    treasurySafe: config.safes?.treasurySafe,
    executorSafe: config.safes?.executorSafe,
    signalerSafe: config.safes?.signalerSafe,
    mainnetDeploymentApproved: Boolean(config.controls?.mainnetDeploymentApproved),
    publicSaleApproved: Boolean(config.controls?.publicSaleApproved),
    realTreasuryFundingApproved: Boolean(config.controls?.realTreasuryFundingApproved)
  },
  issues,
  warnings,
  safety: {
    sendsTransactions: false,
    deploysContracts: false,
    movesFunds: false,
    approvesPublicSale: false
  }
};

fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + "\n");

console.log("AstraTreasury Mainnet Final Preflight");
console.log("====================================");
console.log(`Mode: ${report.mode}`);
console.log(`Status: ${report.status}`);
console.log(`Network: ${networkName}`);
console.log(`Chain ID: ${chainId}`);
console.log(`Deployer: ${deployer}`);
console.log(`Deployer balance: ${formatEther(balanceWei)} ETH`);
console.log(`Report: ${outFile}`);

if (warnings.length > 0) {
  console.log("");
  console.log("Warnings:");
  console.table(warnings);
}

if (issues.length > 0) {
  console.log("");
  console.log("Issues:");
  console.table(issues);
  process.exit(1);
}
