import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "treasury-risk-limits.config.json");

const requiredFiles = [
  "docs/treasury-risk/TREASURY_RISK_LIMITS_POLICY.md",
  "docs/treasury-risk/INITIAL_TREASURY_RISK_LIMITS_DRAFT.md",
  "docs/treasury-risk/TREASURY_ASSET_APPROVAL_POLICY.md",
  "docs/treasury-risk/TREASURY_RISK_DECISION_RECORD.md",
  "docs/treasury-risk/TREASURY_CHANGE_CONTROL.md",
  "docs/treasury-risk/TREASURY_RISK_BLOCKERS.md",
  "public-docs/stabilization-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/legal-full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/execution-dry-run-status.json",
  "public-docs/disclosures-status.json",
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
  issue("configs/treasury-risk-limits.config.json", "Missing treasury risk limits config.");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required treasury risk file.");
  }
}

if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  if (config.network?.chainId !== 8453) {
    issue("network.chainId", "Expected Base Mainnet chain ID 8453.");
  }

  if (config.operatorReportedClearances?.auditCleared !== true) {
    issue("operatorReportedClearances.auditCleared", "Audit clearance should be recorded as true per operator confirmation.");
  }

  if (config.operatorReportedClearances?.legalCleared !== true) {
    issue("operatorReportedClearances.legalCleared", "Legal clearance should be recorded as true per operator confirmation.");
  }

  const mustRemainFalse = [
    "treasuryRiskLimitsApproved",
    "treasuryFundingApproved",
    "treasuryFundingTransactionAuthorized",
    "treasuryFundingExecuted"
  ];

  for (const key of mustRemainFalse) {
    if (config[key] !== false) {
      issue(key, "Must remain false until separately approved.");
    }
  }

  const limits = config.effectiveLimits || {};

  for (const key of [
    "maximumInitialFundingUsd",
    "maximumSingleTransferUsd",
    "maximumDailyTransferUsd"
  ]) {
    if (Number(limits[key]) !== 0) {
      issue(`effectiveLimits.${key}`, "Effective funding limit must remain 0 until approved.");
    }
  }

  if (!Array.isArray(limits.approvedExternalTreasuryAssets) || limits.approvedExternalTreasuryAssets.length !== 0) {
    issue("effectiveLimits.approvedExternalTreasuryAssets", "Approved external assets must remain empty.");
  }

  if (!Array.isArray(limits.approvedFundingDestinations) || limits.approvedFundingDestinations.length !== 0) {
    issue("effectiveLimits.approvedFundingDestinations", "Approved funding destinations must remain empty.");
  }

  if (limits.executionQueueEnabled !== false) {
    issue("effectiveLimits.executionQueueEnabled", "Execution queue must remain disabled.");
  }

  for (const [key, value] of Object.entries(config.hardStops || {})) {
    if (value !== false) {
      issue(`hardStops.${key}`, "Hard stop must remain false.");
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

const incidentsPath = path.join(root, "public-docs", "incident-summary.json");
if (fs.existsSync(incidentsPath)) {
  const incidents = JSON.parse(fs.readFileSync(incidentsPath, "utf8"));

  if (Number(incidents?.summary?.active || 0) !== 0) {
    issue("incidents.summary.active", "Active incidents must be zero.");
  }
}

const result = {
  schema: "astra-treasury-risk-limits-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
