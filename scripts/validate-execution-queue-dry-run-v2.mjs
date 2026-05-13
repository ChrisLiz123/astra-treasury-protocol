import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "execution-queue-dry-run-v2.config.json");

const requiredFiles = [
  "docs/execution-queue/EXECUTION_QUEUE_DRY_RUN_V2.md",
  "docs/execution-queue/EXECUTION_QUEUE_DRY_RUN_CASES.md",
  "docs/execution-queue/EXECUTION_QUEUE_V2_APPROVAL_REQUIREMENTS.md",
  "docs/execution-queue/EXECUTION_QUEUE_DRY_RUN_V2_DECISION_RECORD.md",
  "public-docs/stabilization-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/legal-full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/restricted-operations-status.json",
  "public-docs/mainnet-execution-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/incident-summary.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

if (!fs.existsSync(configPath)) {
  issue("configs/execution-queue-dry-run-v2.config.json", "Missing execution dry-run v2 config.");
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

  const queue = config.executionQueue || {};

  const mustRemainFalse = [
    "enabled",
    "mainnetExecutionQueueEnabled",
    "paperToOnchainAutomationEnabled",
    "autonomousExecutionEnabled"
  ];

  for (const key of mustRemainFalse) {
    if (queue[key] !== false) {
      issue(`executionQueue.${key}`, "Execution queue capability must remain false.");
    }
  }

  const mustRemainTrue = [
    "manualExecutionApprovalRequired",
    "governanceSafeApprovalRequired",
    "executorSafeReviewRequired"
  ];

  for (const key of mustRemainTrue) {
    if (queue[key] !== true) {
      issue(`executionQueue.${key}`, "Approval requirement must remain true.");
    }
  }

  for (const [key, value] of Object.entries(config.dryRunRules || {})) {
    if (value !== false) {
      issue(`dryRunRules.${key}`, "Dry-run rule must remain false.");
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
    issue("mainnetExecution.mode", "Mainnet execution queue must remain disabled.");
  }
}

const treasuryPath = path.join(root, "public-docs", "treasury-funding-status.json");
if (fs.existsSync(treasuryPath)) {
  const treasury = JSON.parse(fs.readFileSync(treasuryPath, "utf8"));
  if (treasury.treasuryFundingApproved !== false) {
    issue("treasuryFundingApproved", "Treasury funding must remain not approved.");
  }
}

const incidentsPath = path.join(root, "public-docs", "incident-summary.json");
if (fs.existsSync(incidentsPath)) {
  const incidents = JSON.parse(fs.readFileSync(incidentsPath, "utf8"));
  if (Number(incidents?.summary?.active || 0) !== 0) {
    issue("incidents.summary.active", "Active incidents must be zero for dry-run readiness.");
  }
}

const result = {
  schema: "astra-execution-queue-dry-run-v2-validation",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
