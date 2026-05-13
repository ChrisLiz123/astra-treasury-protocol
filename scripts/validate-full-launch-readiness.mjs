import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const configPath = path.join(root, "configs", "full-launch-readiness.config.json");

const requiredFiles = [
  "docs/full-launch/FULL_LAUNCH_READINESS.md",
  "docs/full-launch/FULL_LAUNCH_APPROVAL_MATRIX.md",
  "docs/full-launch/FULL_LAUNCH_DECISION_RECORD.md",
  "docs/full-launch/FULL_LAUNCH_BLOCKERS.md",
  "public-docs/stabilization-status.json",
  "public-docs/restricted-launch-status.json",
  "public-docs/restricted-operations-status.json",
  "public-docs/mainnet-execution-status.json",
  "public-docs/capability-roadmap-status.json",
  "public-docs/trust-status.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

if (!fs.existsSync(configPath)) {
  issue("configs/full-launch-readiness.config.json", "Missing full-launch readiness config.");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required file.");
  }
}

if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  if (config.network?.chainId !== 8453) {
    issue("network.chainId", "Expected Base Mainnet chain ID 8453.");
  }

  if (config.fullLaunchApproved !== false) {
    issue("fullLaunchApproved", "Full launch must remain false until separately approved.");
  }

  for (const [key, value] of Object.entries(config.capabilityApprovals || {})) {
    if (value !== false) {
      issue(`capabilityApprovals.${key}`, "Capability approval must remain false in planning-only mode.");
    }
  }
}

const stabilizationPath = path.join(root, "public-docs", "stabilization-status.json");
if (fs.existsSync(stabilizationPath)) {
  const stabilization = JSON.parse(fs.readFileSync(stabilizationPath, "utf8"));

  if (stabilization.status !== "RESTRICTED_LAUNCH_STABILIZED") {
    issue("stabilization.status", `Expected RESTRICTED_LAUNCH_STABILIZED, got ${stabilization.status}`);
  }
}

const executionPath = path.join(root, "public-docs", "mainnet-execution-status.json");
if (fs.existsSync(executionPath)) {
  const execution = JSON.parse(fs.readFileSync(executionPath, "utf8"));

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("execution.mode", "Mainnet execution queue must remain disabled.");
  }
}

const restrictedPath = path.join(root, "public-docs", "restricted-operations-status.json");
if (fs.existsSync(restrictedPath)) {
  const restricted = JSON.parse(fs.readFileSync(restrictedPath, "utf8"));
  const flags = restricted.restrictedCapabilities || {};

  for (const [key, value] of Object.entries(flags)) {
    if (value !== false) {
      issue(`restrictedCapabilities.${key}`, "Restricted capability must remain false.");
    }
  }
}

const result = {
  schema: "astra-full-launch-readiness-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
