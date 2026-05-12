import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configFile = path.join(root, "configs", "capability-roadmap.config.json");

const requiredFiles = [
  "docs/roadmap/CAPABILITY_ROADMAP.md",
  "docs/roadmap/CAPABILITY_APPROVAL_PROCESS.md",
  "docs/roadmap/PUBLIC_TOKEN_SALE_APPROVAL_TRACK.md",
  "docs/roadmap/REAL_TREASURY_FUNDING_APPROVAL_TRACK.md",
  "docs/roadmap/MAINNET_EXECUTION_QUEUE_APPROVAL_TRACK.md",
  "docs/roadmap/AUTONOMOUS_EXECUTION_APPROVAL_TRACK.md",
  "docs/roadmap/CAPABILITY_ROADMAP_STATUS.md",
  "configs/restricted-operations.config.json",
  "configs/mainnet-execution-queue.config.json",
  "public-docs/restricted-operations-status.json",
  "public-docs/mainnet-execution-status.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

if (!fs.existsSync(configFile)) {
  issue("configs/capability-roadmap.config.json", "Missing capability roadmap config.");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required file.");
  }
}

if (fs.existsSync(configFile)) {
  const config = JSON.parse(fs.readFileSync(configFile, "utf8"));

  if (config.network?.chainId !== 8453) {
    issue("network.chainId", "Expected Base Mainnet chain ID 8453.");
  }

  for (const [key, capability] of Object.entries(config.capabilities || {})) {
    if (capability.status !== "DISABLED") {
      issue(`capabilities.${key}.status`, "Every roadmap capability must remain DISABLED.");
    }

    if (capability.approvalRequired !== true) {
      issue(`capabilities.${key}.approvalRequired`, "Every capability must require approval.");
    }

    if (!Array.isArray(capability.requiredApprovals) || capability.requiredApprovals.length === 0) {
      issue(`capabilities.${key}.requiredApprovals`, "Every capability must list required approvals.");
    }
  }
}

const restrictedStatusPath = path.join(root, "public-docs", "restricted-operations-status.json");
const executionStatusPath = path.join(root, "public-docs", "mainnet-execution-status.json");

if (fs.existsSync(restrictedStatusPath)) {
  const restricted = JSON.parse(fs.readFileSync(restrictedStatusPath, "utf8"));
  const flags = restricted.restrictedCapabilities || {};

  for (const [key, value] of Object.entries(flags)) {
    if (value !== false) {
      issue(`restrictedCapabilities.${key}`, "Restricted capability must remain false.");
    }
  }
}

if (fs.existsSync(executionStatusPath)) {
  const execution = JSON.parse(fs.readFileSync(executionStatusPath, "utf8"));

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("mainnetExecution.mode", "Mainnet execution queue must remain disabled.");
  }
}

const result = {
  schema: "astra-capability-roadmap-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
