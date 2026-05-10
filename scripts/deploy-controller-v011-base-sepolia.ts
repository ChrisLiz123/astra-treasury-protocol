import { network } from "hardhat";
import fs from "node:fs";

type HexAddress = `0x${string}`;

function loadEnvFile(filePath: string): void {
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

function requireAddress(name: string): HexAddress {
  const value = process.env[name];

  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${name} is missing or invalid.`);
  }

  return value as HexAddress;
}

function upsertEnvValue(filePath: string, key: string, value: string): void {
  const line = `export ${key}=${value}`;
  const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const pattern = new RegExp(`^(?:export\\s+)?${key}=.*$`, "m");

  const next = pattern.test(content)
    ? content.replace(pattern, line)
    : content.trimEnd() + "\n" + line + "\n";

  fs.writeFileSync(filePath, next);
}

const envPath = "deployments/base-sepolia.env";

loadEnvFile(envPath);

const admin = requireAddress("ASTRA_ADMIN");
const vaultAddress = requireAddress("ASTRA_VAULT");
const policyAddress = requireAddress("ASTRA_POLICY");
const registryAddress = requireAddress("ASTRA_SIGNAL_REGISTRY");
const oldControllerAddress = requireAddress("ASTRA_CONTROLLER");

const { viem, networkName } = await network.create();
const publicClient = await viem.getPublicClient();
const [walletClient] = await viem.getWalletClients();

const deployer = walletClient.account.address;

console.log(`Network: ${networkName}`);
console.log(`Deployer: ${deployer}`);
console.log(`Admin: ${admin}`);
console.log(`Vault: ${vaultAddress}`);
console.log(`Policy: ${policyAddress}`);
console.log(`SignalRegistry: ${registryAddress}`);
console.log(`Old ExecutionController: ${oldControllerAddress}`);

console.log("Deploying patched ExecutionController v0.1.1...");

const newController = await viem.deployContract("ExecutionController", [
  admin,
  vaultAddress,
  policyAddress,
  registryAddress
]);

console.log(`New ExecutionController: ${newController.address}`);

const vault = await viem.getContractAt("TreasuryVault", vaultAddress);
const vaultExecutorRole = await vault.read.EXECUTOR_ROLE();

const newHasRole = await vault.read.hasRole([vaultExecutorRole, newController.address]);

if (!newHasRole) {
  console.log("Granting vault EXECUTOR_ROLE to new controller...");
  const grantTx = await vault.write.grantRole([vaultExecutorRole, newController.address]);
  console.log(`Grant tx: ${grantTx}`);
  await publicClient.waitForTransactionReceipt({ hash: grantTx, confirmations: 1 });
}

const oldHasRole = await vault.read.hasRole([vaultExecutorRole, oldControllerAddress]);

if (oldHasRole) {
  console.log("Revoking vault EXECUTOR_ROLE from old controller...");
  const revokeTx = await vault.write.revokeRole([vaultExecutorRole, oldControllerAddress]);
  console.log(`Revoke tx: ${revokeTx}`);
  await publicClient.waitForTransactionReceipt({ hash: revokeTx, confirmations: 1 });
}

upsertEnvValue(envPath, "ASTRA_CONTROLLER_OLD_V010", oldControllerAddress);
upsertEnvValue(envPath, "ASTRA_CONTROLLER_V011", newController.address);
upsertEnvValue(envPath, "ASTRA_CONTROLLER", newController.address);

console.log("Updated deployments/base-sepolia.env:");
console.log(`ASTRA_CONTROLLER_OLD_V010=${oldControllerAddress}`);
console.log(`ASTRA_CONTROLLER_V011=${newController.address}`);
console.log(`ASTRA_CONTROLLER=${newController.address}`);

console.log("Patched controller deployment complete.");
console.log(`BaseScan: https://sepolia.basescan.org/address/${newController.address}`);
