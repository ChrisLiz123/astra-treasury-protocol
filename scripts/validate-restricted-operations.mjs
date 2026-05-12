import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const configPath = path.join(root, "configs", "restricted-operations.config.json");
const mainnetManifestPath = path.join(root, "deployments", "base-mainnet.public.json");
const postdeployReportPath = path.join(root, "reports", "mainnet-postdeploy", "mainnet-postdeploy-check-v1.json");

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

const config = readJson(configPath);
const manifest = readJson(mainnetManifestPath);
const postdeploy = readJson(postdeployReportPath);

const issues = [];
const warnings = [];

function issue(path, message) {
  issues.push({ path, message });
}

function warn(path, message) {
  warnings.push({ path, message });
}

if (!config) {
  issue("configs/restricted-operations.config.json", "Restricted operations config missing.");
}

if (!manifest?.contracts) {
  issue("deployments/base-mainnet.public.json", "Base Mainnet public manifest missing or invalid.");
}

if (postdeploy?.status !== "PASS") {
  issue("reports/mainnet-postdeploy/mainnet-postdeploy-check-v1.json", "Post-deployment verification must be PASS.");
}

if (config?.network?.chainId !== 8453) {
  issue("network.chainId", "Expected Base Mainnet chain ID 8453.");
}

const restricted = config?.restrictedCapabilities || {};

const mustRemainFalse = [
  "publicTokenSaleApproved",
  "realTreasuryFundingApproved",
  "stakingOrRewardsApproved",
  "buybackProgramApproved",
  "autonomousExecutionApproved",
  "mainnetExecutionQueueEnabled",
  "mainnetPaperToOnchainAutomationEnabled"
];

for (const key of mustRemainFalse) {
  if (restricted[key] !== false) {
    issue(`restrictedCapabilities.${key}`, "Restricted capability must remain false unless separately approved.");
  }
}

if (manifest?.safetyStatus?.publicTokenSale !== false) {
  warn("manifest.safetyStatus.publicTokenSale", "Public manifest should show public token sale is false.");
}

if (manifest?.safetyStatus?.realTreasuryFunding !== false) {
  warn("manifest.safetyStatus.realTreasuryFunding", "Public manifest should show real treasury funding is false.");
}

const result = {
  schema: "astra-restricted-operations-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  mode: "MAINNET_RESTRICTED_OPERATION",
  issues,
  warnings,
  restrictedCapabilities: restricted
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
