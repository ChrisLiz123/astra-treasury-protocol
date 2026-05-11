import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const configPath = path.join(root, "configs", "mainnet-production.config.json");
const outDir = path.join(root, "reports", "mainnet-dry-run");
const reportFile = path.join(outDir, "mainnet-dry-run-v1.json");
const publicDocFile = path.join(root, "docs", "mainnet-live", "MAINNET_DEPLOYMENT_DRY_RUN_V1.md");

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.dirname(publicDocFile), { recursive: true });

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function isPlaceholder(value) {
  return !value || value === "TBD" || String(value).startsWith("REPLACE_");
}

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

if (!fs.existsSync(configPath)) {
  console.error(`Missing private config: ${configPath}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const issues = [];

function issue(path, message) {
  issues.push({ path, message });
}

if (config.network?.chainId !== 8453) {
  issue("network.chainId", "Expected Base Mainnet chainId 8453.");
}

if (isPlaceholder(config.rpc?.primaryProvider)) {
  issue("rpc.primaryProvider", "Primary RPC provider is missing.");
}

if (isPlaceholder(config.rpc?.backupProvider)) {
  issue("rpc.backupProvider", "Backup RPC provider is missing.");
}

for (const [key, value] of Object.entries(config.safes || {})) {
  if (!isAddress(value)) {
    issue(`safes.${key}`, "Must be a valid Safe address.");
  }
}

for (const [key, value] of Object.entries(config.allocationWallets || {})) {
  if (!isAddress(value)) {
    issue(`allocationWallets.${key}`, "Must be a valid wallet or Safe address.");
  }
}

if (!isAddress(config.deployer?.address)) {
  issue("deployer.address", "Must be a valid deployer address.");
}

if (config.controls?.auditCleared !== true) {
  issue("controls.auditCleared", "Audit must be cleared.");
}

if (config.controls?.legalCleared !== true) {
  issue("controls.legalCleared", "Legal must be cleared.");
}

if (config.controls?.publicSaleApproved === true) {
  issue("controls.publicSaleApproved", "Public sale approval must not be bundled into deployment dry run.");
}

if (config.controls?.realTreasuryFundingApproved === true) {
  issue("controls.realTreasuryFundingApproved", "Real treasury funding must not be bundled into deployment dry run.");
}

const finalApproval = config.controls?.mainnetDeploymentApproved === true;

const constructorPlan = {
  TreasuryPolicy: {
    constructor: ["admin"],
    values: [config.safes.governanceSafe]
  },
  TreasuryVault: {
    constructor: ["admin", "policy"],
    values: [config.safes.governanceSafe, "DEPLOYED_TREASURY_POLICY_ADDRESS"]
  },
  SignalRegistry: {
    constructor: ["admin"],
    values: [config.safes.governanceSafe]
  },
  ExecutionController: {
    constructor: ["admin", "vault", "policy", "signalRegistry"],
    values: [
      config.safes.governanceSafe,
      "DEPLOYED_TREASURY_VAULT_ADDRESS",
      "DEPLOYED_TREASURY_POLICY_ADDRESS",
      "DEPLOYED_SIGNAL_REGISTRY_ADDRESS"
    ]
  },
  AstraToken: {
    constructor: [
      "treasuryVault",
      "ecosystemWallet",
      "liquidityWallet",
      "teamWallet",
      "communityWallet",
      "advisorsWallet"
    ],
    values: [
      "DEPLOYED_TREASURY_VAULT_ADDRESS",
      config.allocationWallets.ecosystemWallet,
      config.allocationWallets.liquidityWallet,
      config.allocationWallets.teamWallet,
      config.allocationWallets.communityWallet,
      config.allocationWallets.advisorsWallet
    ]
  }
};

const deploymentSequence = [
  "Deploy TreasuryPolicy with Governance Safe as admin.",
  "Deploy TreasuryVault with Governance Safe as admin and TreasuryPolicy address.",
  "Deploy SignalRegistry with Governance Safe as admin.",
  "Deploy ExecutionController with Governance Safe, TreasuryVault, TreasuryPolicy, and SignalRegistry.",
  "Deploy AstraToken with TreasuryVault and allocation wallet/Safe addresses.",
  "Approve ASTP as TreasuryPolicy asset if required by policy setup.",
  "Grant TreasuryVault.EXECUTOR_ROLE to ExecutionController.",
  "Grant SignalRegistry.SIGNALER_ROLE to Signaler Safe.",
  "Grant ExecutionController.EXECUTOR_ROLE to Executor Safe.",
  "Verify deployer has no long-term privileged role.",
  "Verify contracts on BaseScan.",
  "Update public deployment manifest only after final approval and deployment."
];

const roleTransferPlan = {
  governanceSafe: {
    address: config.safes.governanceSafe,
    receives: [
      "TreasuryPolicy.DEFAULT_ADMIN_ROLE",
      "TreasuryVault.DEFAULT_ADMIN_ROLE",
      "SignalRegistry.DEFAULT_ADMIN_ROLE",
      "ExecutionController.DEFAULT_ADMIN_ROLE"
    ]
  },
  executorSafe: {
    address: config.safes.executorSafe,
    receives: ["ExecutionController.EXECUTOR_ROLE"],
    mustNotReceive: ["TreasuryVault.EXECUTOR_ROLE"]
  },
  signalerSafe: {
    address: config.safes.signalerSafe,
    receives: ["SignalRegistry.SIGNALER_ROLE"],
    mustNotReceive: ["TreasuryVault.EXECUTOR_ROLE", "ExecutionController.EXECUTOR_ROLE"]
  },
  executionController: {
    receives: ["TreasuryVault.EXECUTOR_ROLE"]
  },
  deployer: {
    address: config.deployer.address,
    finalRoleState: "no privileged roles"
  }
};

const report = {
  schema: "astra-mainnet-deployment-dry-run-v1",
  generatedAt: new Date().toISOString(),
  status: issues.length === 0 ? "READY_FOR_FINAL_GO_NO_GO_REVIEW" : "BLOCKED_BY_CONFIG_ISSUES",
  finalDeploymentApproval: finalApproval ? "APPROVED" : "PENDING_FINAL_GO_NO_GO",
  warning:
    "This is a dry-run report. It does not authorize mainnet deployment and does not send transactions.",
  network: config.network,
  rpc: {
    primaryProvider: config.rpc.primaryProvider,
    primaryRpcConfigVariable: config.rpc.primaryRpcConfigVariable,
    backupProvider: config.rpc.backupProvider,
    backupRpcConfigVariable: config.rpc.backupRpcConfigVariable
  },
  configFingerprint: sha256({
    network: config.network,
    rpc: config.rpc,
    safes: config.safes,
    allocationWallets: config.allocationWallets,
    deployer: config.deployer,
    controls: config.controls
  }),
  safes: config.safes,
  allocationWallets: config.allocationWallets,
  deployer: config.deployer,
  constructorPlan,
  deploymentSequence,
  roleTransferPlan,
  issues
};

fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + "\n");

const publicDoc = [
  "# Mainnet Deployment Dry Run v1",
  "",
  "## Status",
  "",
  `Dry-run status: ${report.status}`,
  `Final deployment approval: ${report.finalDeploymentApproval}`,
  "",
  "## Important",
  "",
  "This dry run does not authorize deployment and does not send Base Mainnet transactions.",
  "",
  "## Network",
  "",
  "Base Mainnet",
  "",
  "Chain ID: 8453",
  "",
  "## Completed inputs",
  "",
  "- Primary RPC provider selected.",
  "- Backup RPC provider selected.",
  "- Governance Safe configured.",
  "- Treasury Safe configured.",
  "- Executor Safe configured.",
  "- Signaler Safe configured.",
  "- Allocation wallets/Safes configured.",
  "- Deployer address configured.",
  "- Audit cleared.",
  "- Legal cleared.",
  "",
  "## Still required before deployment",
  "",
  "- Final go/no-go approval.",
  "- Mainnet deployment command review.",
  "- Final BaseScan verification plan.",
  "- Final signer availability check.",
  "- Final incident response readiness check.",
  "",
  "## Deployment sequence preview",
  "",
  ...deploymentSequence.map((step, index) => `${index + 1}. ${step}`),
  "",
  "## Rule",
  "",
  "Do not set `mainnetDeploymentApproved` to true until the final explicit go/no-go."
];

fs.writeFileSync(publicDocFile, publicDoc.join("\n") + "\n");

console.log("Mainnet Deployment Dry Run v1");
console.log("=============================");
console.log(`Status: ${report.status}`);
console.log(`Final approval: ${report.finalDeploymentApproval}`);
console.log(`Private report: ${reportFile}`);
console.log(`Public doc: ${publicDocFile}`);

if (issues.length > 0) {
  console.log("");
  console.log("Config issues:");
  console.table(issues);
  process.exit(1);
}
