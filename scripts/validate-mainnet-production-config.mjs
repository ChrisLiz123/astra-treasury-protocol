import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = process.argv[2] || "configs/mainnet-production.config.json";
const fullPath = path.join(root, configPath);

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function isPlaceholder(value) {
  return !value || value === "TBD" || String(value).startsWith("REPLACE_");
}

function addIssue(issues, path, message) {
  issues.push({ path, message });
}

if (!fs.existsSync(fullPath)) {
  console.error(`Missing config: ${configPath}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(fullPath, "utf8"));
const issues = [];

if (config.network?.chainId !== 8453) {
  addIssue(issues, "network.chainId", "Expected Base Mainnet chainId 8453.");
}

if (isPlaceholder(config.rpc?.primaryProvider)) {
  addIssue(issues, "rpc.primaryProvider", "Primary RPC provider must be selected.");
}

if (isPlaceholder(config.rpc?.backupProvider)) {
  addIssue(issues, "rpc.backupProvider", "Backup RPC provider must be selected.");
}

for (const [key, value] of Object.entries(config.safes || {})) {
  if (!isAddress(value)) {
    addIssue(issues, `safes.${key}`, "Must be a valid Safe address.");
  }
}

for (const [key, value] of Object.entries(config.allocationWallets || {})) {
  if (!isAddress(value)) {
    addIssue(issues, `allocationWallets.${key}`, "Must be a valid wallet or Safe address.");
  }
}

if (!isAddress(config.deployer?.address)) {
  addIssue(issues, "deployer.address", "Must be a valid deployer address.");
}

if (config.controls?.auditCleared !== true) {
  addIssue(issues, "controls.auditCleared", "Audit must be cleared.");
}

if (config.controls?.legalCleared !== true) {
  addIssue(issues, "controls.legalCleared", "Legal must be cleared.");
}

if (config.controls?.mainnetDeploymentApproved !== true) {
  addIssue(issues, "controls.mainnetDeploymentApproved", "Final deployment approval is still false.");
}

if (config.controls?.publicSaleApproved === true) {
  addIssue(issues, "controls.publicSaleApproved", "Public sale approval should not be bundled with deployment config.");
}

const result = {
  schema: "astra-mainnet-production-config-validation-v0.1",
  checkedAt: new Date().toISOString(),
  configPath,
  status: issues.length === 0 ? "PASS" : "BLOCKED",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
