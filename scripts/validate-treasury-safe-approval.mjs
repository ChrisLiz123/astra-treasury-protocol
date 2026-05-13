import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "treasury-safe-approval.config.json");

const requiredFiles = [
  "docs/treasury-safe/TREASURY_SAFE_APPROVAL_PACKAGE.md",
  "docs/treasury-safe/TREASURY_SAFE_OWNER_REVIEW_CHECKLIST.md",
  "docs/treasury-safe/TREASURY_SAFE_APPROVAL_DECISION_RECORD.md",
  "docs/treasury-safe/TREASURY_SAFE_TRANSACTION_REVIEW_TEMPLATE.md",
  "docs/treasury-safe/TREASURY_SAFE_SIGNER_RUNBOOK.md",
  "docs/treasury-safe/TREASURY_SAFE_APPROVAL_BLOCKERS.md",
  "public-docs/stabilization-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/legal-full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/treasury-risk-status.json",
  "public-docs/treasury-source-status.json",
  "public-docs/disclosures-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-alerts-status.json",
  "public-docs/incident-summary.json",
  "public-docs/mainnet-execution-status.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

if (!fs.existsSync(configPath)) {
  issue("configs/treasury-safe-approval.config.json", "Missing Treasury Safe approval config.");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required Treasury Safe approval file.");
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
    "treasurySafeApprovalRequested",
    "treasurySafeApprovalRecorded",
    "treasurySafeTransactionPrepared",
    "treasurySafeTransactionSubmitted",
    "treasurySafeTransactionExecuted",
    "treasuryFundingApproved",
    "treasuryFundingTransactionAuthorized",
    "treasuryFundingExecuted",
    "fundingSourceApproved",
    "treasuryRiskLimitsApproved"
  ];

  for (const key of mustRemainFalse) {
    if (config[key] !== false) {
      issue(key, "Treasury Safe approval item must remain false until separately approved.");
    }
  }

  for (const [key, value] of Object.entries(config.requiredBeforeTreasurySafeApproval || {})) {
    if (["mainnetMonitorPassing", "activeIncidentsZero"].includes(key)) {
      if (value !== true) {
        issue(`requiredBeforeTreasurySafeApproval.${key}`, "Operational prerequisite should be true.");
      }
    } else if (value !== false) {
      issue(`requiredBeforeTreasurySafeApproval.${key}`, "Approval prerequisite must remain false until separately approved.");
    }
  }

  for (const [key, value] of Object.entries(config.safeApprovalChecklist || {})) {
    if (value !== false) {
      issue(`safeApprovalChecklist.${key}`, "Safe checklist item must remain false until actual Safe review.");
    }
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

const treasuryFundingPath = path.join(root, "public-docs", "treasury-funding-status.json");
if (fs.existsSync(treasuryFundingPath)) {
  const treasuryFunding = JSON.parse(fs.readFileSync(treasuryFundingPath, "utf8"));

  if (treasuryFunding.treasuryFundingApproved !== false) {
    issue("treasuryFundingApproved", "Treasury funding must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFundingExecuted", "Treasury funding must remain not executed.");
  }
}

const treasuryRiskPath = path.join(root, "public-docs", "treasury-risk-status.json");
if (fs.existsSync(treasuryRiskPath)) {
  const treasuryRisk = JSON.parse(fs.readFileSync(treasuryRiskPath, "utf8"));

  if (treasuryRisk.treasuryRiskLimitsApproved !== false) {
    issue("treasuryRiskLimitsApproved", "Treasury risk limits must remain not approved.");
  }
}

const treasurySourcePath = path.join(root, "public-docs", "treasury-source-status.json");
if (fs.existsSync(treasurySourcePath)) {
  const treasurySource = JSON.parse(fs.readFileSync(treasurySourcePath, "utf8"));

  if (treasurySource.fundingSourceApproved !== false) {
    issue("fundingSourceApproved", "Funding source must remain not approved.");
  }
}

const monitorPath = path.join(root, "public-docs", "mainnet-monitor-status.json");
if (fs.existsSync(monitorPath)) {
  const monitor = JSON.parse(fs.readFileSync(monitorPath, "utf8"));

  if (monitor.status !== "PASS") {
    issue("mainnetMonitor.status", `Expected PASS, got ${monitor.status}`);
  }
}

const alertsPath = path.join(root, "public-docs", "mainnet-alerts-status.json");
if (fs.existsSync(alertsPath)) {
  const alerts = JSON.parse(fs.readFileSync(alertsPath, "utf8"));

  if (alerts.responseRequired === true) {
    issue("alerts.responseRequired", "Alerts must not require response.");
  }
}

const incidentsPath = path.join(root, "public-docs", "incident-summary.json");
if (fs.existsSync(incidentsPath)) {
  const incidents = JSON.parse(fs.readFileSync(incidentsPath, "utf8"));

  if (Number(incidents?.summary?.active || 0) !== 0) {
    issue("incidents.summary.active", "Active incidents must be zero.");
  }
}

const executionPath = path.join(root, "public-docs", "mainnet-execution-status.json");
if (fs.existsSync(executionPath)) {
  const execution = JSON.parse(fs.readFileSync(executionPath, "utf8"));

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("mainnetExecution.mode", "Mainnet execution queue must remain disabled.");
  }
}

const result = {
  schema: "astra-treasury-safe-approval-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
