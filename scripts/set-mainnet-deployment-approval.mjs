import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "mainnet-production.config.json");
const outDir = path.join(root, "reports", "mainnet-approval");
const statusFile = path.join(outDir, "deployment-approval-status.json");

fs.mkdirSync(outDir, { recursive: true });

const command = process.argv[2] || "status";

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing private config: ${configPath}`);
  }

  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function saveConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}

function validateReadiness(config) {
  const issues = [];

  function issue(path, message) {
    issues.push({ path, message });
  }

  if (config.network?.chainId !== 8453) {
    issue("network.chainId", "Expected Base Mainnet chainId 8453.");
  }

  if (!config.rpc?.primaryProvider || config.rpc.primaryProvider === "TBD") {
    issue("rpc.primaryProvider", "Primary RPC provider missing.");
  }

  if (!config.rpc?.backupProvider || config.rpc.backupProvider === "TBD") {
    issue("rpc.backupProvider", "Backup RPC provider missing.");
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
    issue("controls.publicSaleApproved", "Public sale approval must not be bundled with deployment.");
  }

  if (config.controls?.realTreasuryFundingApproved === true) {
    issue("controls.realTreasuryFundingApproved", "Real treasury funding must not be bundled with deployment.");
  }

  return issues;
}

function writeStatus(config, extra = {}) {
  const issues = validateReadiness(config);

  const status = {
    schema: "astra-mainnet-deployment-approval-status-v0.1",
    checkedAt: new Date().toISOString(),
    command,
    approved: config.controls?.mainnetDeploymentApproved === true,
    status:
      issues.length === 0
        ? config.controls?.mainnetDeploymentApproved === true
          ? "APPROVED_FOR_GUARDED_DEPLOYMENT"
          : "READY_BUT_NOT_APPROVED"
        : "BLOCKED_BY_CONFIG_ISSUES",
    warning:
      "Approval does not deploy contracts, fund treasury, approve public sale, or import Safe payloads.",
    issues,
    controls: {
      auditCleared: Boolean(config.controls?.auditCleared),
      legalCleared: Boolean(config.controls?.legalCleared),
      publicSaleApproved: Boolean(config.controls?.publicSaleApproved),
      realTreasuryFundingApproved: Boolean(config.controls?.realTreasuryFundingApproved),
      mainnetDeploymentApproved: Boolean(config.controls?.mainnetDeploymentApproved)
    },
    extra
  };

  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + "\n");

  console.log(JSON.stringify(status, null, 2));

  return status;
}

try {
  const config = loadConfig();

  if (command === "status") {
    writeStatus(config);
    process.exit(0);
  }

  if (command === "approve") {
    if (process.env.ASTRA_CONFIRM_MAINNET_APPROVAL !== "YES") {
      throw new Error(
        "Approval blocked. Re-run with ASTRA_CONFIRM_MAINNET_APPROVAL=YES only after final go/no-go."
      );
    }

    const issues = validateReadiness(config);

    if (issues.length > 0) {
      writeStatus(config, { attemptedApproval: true });
      throw new Error("Approval blocked by config issues.");
    }

    config.controls.mainnetDeploymentApproved = true;
    config.controls.publicSaleApproved = false;
    config.controls.realTreasuryFundingApproved = false;

    saveConfig(config);
    writeStatus(config, { approvedAt: new Date().toISOString() });

    console.log("");
    console.log("Mainnet deployment approval is now TRUE.");
    console.log("Run final preflight immediately.");
    console.log("If not deploying in this session, run: npm run mainnet:approval:reset");
    process.exit(0);
  }

  if (command === "reset") {
    config.controls.mainnetDeploymentApproved = false;
    config.controls.publicSaleApproved = false;
    config.controls.realTreasuryFundingApproved = false;

    saveConfig(config);
    writeStatus(config, { resetAt: new Date().toISOString() });

    console.log("");
    console.log("Mainnet deployment approval reset to FALSE.");
    process.exit(0);
  }

  throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
