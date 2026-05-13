import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "treasury-safe-transaction-package.config.json");

const requiredFiles = [
  "docs/treasury-safe-transaction/TREASURY_SAFE_TRANSACTION_PACKAGE_PREPARATION.md",
  "docs/treasury-safe-transaction/TREASURY_SAFE_TRANSACTION_PACKAGE_TEMPLATE.md",
  "docs/treasury-safe-transaction/TREASURY_SAFE_PAYLOAD_REVIEW_CHECKLIST.md",
  "docs/treasury-safe-transaction/TREASURY_SAFE_TRANSACTION_DECISION_RECORD.md",
  "docs/treasury-safe-transaction/TREASURY_SAFE_TRANSACTION_BLOCKERS.md",
  "docs/treasury-safe-transaction/TREASURY_SAFE_TRANSACTION_CONFIDENTIALITY.md",
  "public-docs/stabilization-status.json",
  "public-docs/treasury-disclosure-status.json",
  "public-docs/treasury-transaction-dry-run-status.json",
  "public-docs/treasury-safe-status.json",
  "public-docs/treasury-source-status.json",
  "public-docs/treasury-risk-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-alerts-status.json",
  "public-docs/incident-summary.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenPayloadFiles = [
  "reports/treasury-safe-transaction/safe-payload.json",
  "reports/treasury-safe-transaction/safe-transaction.json",
  "reports/treasury-safe-transaction/transaction-builder.json",
  "public-docs/treasury-safe-transaction-payload.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

if (!fs.existsSync(configPath)) {
  issue("configs/treasury-safe-transaction-package.config.json", "Missing Treasury Safe transaction package config.");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required Treasury Safe transaction package file.");
  }
}

for (const file of forbiddenPayloadFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden Safe payload/transaction file exists. This milestone must not generate payloads.");
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

  if (config.transactionPackageScaffoldPrepared !== true) {
    issue("transactionPackageScaffoldPrepared", "Transaction package scaffold should be true.");
  }

  const mustRemainFalse = [
    "safeTransactionPayloadGenerated",
    "safeTransactionPrepared",
    "safeTransactionSubmitted",
    "safeTransactionSigned",
    "safeTransactionExecuted",
    "treasuryFundingTransactionAuthorized",
    "treasuryFundingExecuted",
    "treasurySafeApprovalRecorded",
    "treasuryDisclosureFinalApproved",
    "treasuryRiskLimitsApproved",
    "fundingSourceApproved",
    "treasuryFundingApproved"
  ];

  for (const key of mustRemainFalse) {
    if (config[key] !== false) {
      issue(key, "Transaction package item must remain false until separately approved.");
    }
  }

  const template = config.transactionTemplate || {};
  if (template.calldata !== "not generated") {
    issue("transactionTemplate.calldata", "Calldata must remain not generated.");
  }

  if (template.safePayload !== "not generated") {
    issue("transactionTemplate.safePayload", "Safe payload must remain not generated.");
  }

  if (template.safeTxHash) {
    issue("transactionTemplate.safeTxHash", "Safe transaction hash must remain empty.");
  }

  if (template.executionTxHash) {
    issue("transactionTemplate.executionTxHash", "Execution transaction hash must remain empty.");
  }

  for (const [key, value] of Object.entries(config.requiredBeforePayloadGeneration || {})) {
    if (["mainnetMonitorPassing", "activeIncidentsZero"].includes(key)) {
      if (value !== true) {
        issue(`requiredBeforePayloadGeneration.${key}`, "Operational prerequisite should be true.");
      }
    } else if (value !== false) {
      issue(`requiredBeforePayloadGeneration.${key}`, "Approval prerequisite must remain false until separately approved.");
    }
  }

  for (const [key, value] of Object.entries(config.payloadPreparationRules || {})) {
    if (value !== true) {
      issue(`payloadPreparationRules.${key}`, "Payload safety rule must remain true.");
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

const disclosurePath = path.join(root, "public-docs", "treasury-disclosure-status.json");
if (fs.existsSync(disclosurePath)) {
  const disclosure = JSON.parse(fs.readFileSync(disclosurePath, "utf8"));

  if (disclosure.treasuryDisclosureFinalApproved !== false) {
    issue("treasuryDisclosureFinalApproved", "Treasury disclosure must remain not final-approved.");
  }
}

const txDryRunPath = path.join(root, "public-docs", "treasury-transaction-dry-run-status.json");
if (fs.existsSync(txDryRunPath)) {
  const tx = JSON.parse(fs.readFileSync(txDryRunPath, "utf8"));

  if (tx.status !== "TREASURY_FUNDING_TRANSACTION_DRY_RUN_PASS_NOT_AUTHORIZED") {
    issue("treasuryTransactionDryRun.status", `Expected TREASURY_FUNDING_TRANSACTION_DRY_RUN_PASS_NOT_AUTHORIZED, got ${tx.status}`);
  }

  if (tx.safeTransactionPrepared !== false) {
    issue("treasuryTransactionDryRun.safeTransactionPrepared", "Safe transaction must remain not prepared.");
  }

  if (tx.safeTransactionSubmitted !== false) {
    issue("treasuryTransactionDryRun.safeTransactionSubmitted", "Safe transaction must remain not submitted.");
  }

  if (tx.safeTransactionExecuted !== false) {
    issue("treasuryTransactionDryRun.safeTransactionExecuted", "Safe transaction must remain not executed.");
  }
}

const safePath = path.join(root, "public-docs", "treasury-safe-status.json");
if (fs.existsSync(safePath)) {
  const safe = JSON.parse(fs.readFileSync(safePath, "utf8"));

  if (safe.treasurySafeApprovalRecorded !== false) {
    issue("treasurySafeApprovalRecorded", "Treasury Safe approval must remain not recorded.");
  }

  if (safe.treasurySafeTransactionPrepared !== false) {
    issue("treasurySafeTransactionPrepared", "Treasury Safe transaction must remain not prepared.");
  }
}

const sourcePath = path.join(root, "public-docs", "treasury-source-status.json");
if (fs.existsSync(sourcePath)) {
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

  if (source.fundingSourceApproved !== false) {
    issue("fundingSourceApproved", "Funding source must remain not approved.");
  }
}

const riskPath = path.join(root, "public-docs", "treasury-risk-status.json");
if (fs.existsSync(riskPath)) {
  const risk = JSON.parse(fs.readFileSync(riskPath, "utf8"));

  if (risk.treasuryRiskLimitsApproved !== false) {
    issue("treasuryRiskLimitsApproved", "Treasury risk limits must remain not approved.");
  }
}

const fundingPath = path.join(root, "public-docs", "treasury-funding-status.json");
if (fs.existsSync(fundingPath)) {
  const funding = JSON.parse(fs.readFileSync(fundingPath, "utf8"));

  if (funding.treasuryFundingApproved !== false) {
    issue("treasuryFundingApproved", "Treasury funding must remain not approved.");
  }

  if (funding.treasuryFundingExecuted !== false) {
    issue("treasuryFundingExecuted", "Treasury funding must remain not executed.");
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
  schema: "astra-treasury-safe-transaction-package-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
