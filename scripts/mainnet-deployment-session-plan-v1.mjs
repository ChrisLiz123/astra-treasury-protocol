import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const configPath = path.join(root, "configs", "mainnet-production.config.json");
const reportDir = path.join(root, "reports", "mainnet-session");
const reportFile = path.join(reportDir, "deployment-session-plan-v1.json");

fs.mkdirSync(reportDir, { recursive: true });

function run(command, opts = {}) {
  try {
    const stdout = execSync(command, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...opts
    });

    return {
      command,
      ok: true,
      stdoutTail: stdout.slice(-2000)
    };
  } catch (error) {
    return {
      command,
      ok: false,
      stdoutTail: String(error.stdout || "").slice(-2000),
      stderrTail: String(error.stderr || "").slice(-2000),
      message: error.message
    };
  }
}

function readJson(file, fallback = null) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return {
      error: error.message
    };
  }
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

const config = readJson(configPath);

if (!config) {
  console.error(`Missing config: ${configPath}`);
  process.exit(1);
}

const checks = [];
const issues = [];
const warnings = [];

function check(name, pass, details = {}) {
  checks.push({ name, pass, details });
  if (!pass) issues.push({ name, details });
}

check("config chainId is Base Mainnet", config.network?.chainId === 8453, {
  chainId: config.network?.chainId
});

check("audit cleared", config.controls?.auditCleared === true);
check("legal cleared", config.controls?.legalCleared === true);
check("public sale not approved in deployment config", config.controls?.publicSaleApproved !== true);
check("real treasury funding not approved in deployment config", config.controls?.realTreasuryFundingApproved !== true);
check("mainnet deployment approval is currently false", config.controls?.mainnetDeploymentApproved === false, {
  mainnetDeploymentApproved: config.controls?.mainnetDeploymentApproved
});

for (const [key, value] of Object.entries(config.safes || {})) {
  check(`safe ${key} is valid address`, isAddress(value), { value });
}

for (const [key, value] of Object.entries(config.allocationWallets || {})) {
  check(`allocation ${key} is valid address`, isAddress(value), { value });
}

check("deployer address is valid", isAddress(config.deployer?.address), {
  deployer: config.deployer?.address
});

const deploymentReportPath = path.join(root, "reports", "mainnet-deployment", "mainnet-deployment-v1.json");

if (fs.existsSync(deploymentReportPath)) {
  warnings.push({
    path: "reports/mainnet-deployment/mainnet-deployment-v1.json",
    message: "A mainnet deployment report already exists. Confirm whether deployment already occurred."
  });
}

const commands = {
  preApprovalPreflight: "npm run mainnet:approval:preflight",
  approval: "ASTRA_CONFIRM_MAINNET_APPROVAL=YES npm run mainnet:approval:approve",
  approvedPreflight: "npm run mainnet:deployment-session:preflight-approved",
  deploy: "ASTRA_MAINNET_DEPLOYMENT_APPROVED=YES npm run deploy:base-mainnet:guarded",
  resetApproval: "npm run mainnet:approval:reset",
  generateSafePayloads: "npm run safe:payloads:v1:require-deployment"
};

const dryChecks = [
  run("npm run mainnet:approval:status"),
  run("npm run mainnet:commands:v1"),
  run("npm run safe:payloads:v1")
];

for (const result of dryChecks) {
  check(`dry check passes: ${result.command}`, result.ok, result);
}

const status = issues.length === 0 ? "READY_FOR_OPERATOR_REVIEW" : "BLOCKED";

const report = {
  schema: "astra-mainnet-deployment-session-plan-v1",
  generatedAt: new Date().toISOString(),
  status,
  warning: "This is a planning report only. It does not approve or execute deployment.",
  checks,
  issues,
  warnings,
  commands,
  requiredHumanDecision:
    "Only run the approval and deploy commands after final explicit go/no-go in the same operator session.",
  safety: {
    deploysContracts: false,
    sendsTransactions: false,
    movesFunds: false,
    approvesPublicSale: false,
    approvesRealTreasuryFunding: false
  }
};

fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + "\n");

console.log("AstraTreasury Mainnet Deployment Session Plan v1");
console.log("================================================");
console.log(`Status: ${status}`);
console.log(`Report: ${reportFile}`);

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

console.log("");
console.log("Command order for actual deployment session:");
console.log(`1. ${commands.preApprovalPreflight}`);
console.log(`2. ${commands.approval}`);
console.log(`3. ${commands.approvedPreflight}`);
console.log(`4. ${commands.deploy}`);
console.log(`5. Confirm reports/mainnet-deployment/mainnet-deployment-v1.json exists.`);
console.log(`6. ${commands.resetApproval}`);
console.log(`7. ${commands.generateSafePayloads}`);
