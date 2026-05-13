import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "treasury-funding-transaction-dry-run.config.json");

const requiredFiles = [
  "docs/treasury-transaction/TREASURY_FUNDING_TRANSACTION_DRY_RUN.md",
  "docs/treasury-transaction/TREASURY_TRANSACTION_DRY_RUN_CASES.md",
  "docs/treasury-transaction/TREASURY_TRANSACTION_PAYLOAD_REQUIREMENTS.md",
  "docs/treasury-transaction/TREASURY_TRANSACTION_DRY_RUN_DECISION_RECORD.md",
  "docs/treasury-transaction/TREASURY_TRANSACTION_DRY_RUN_BLOCKERS.md",
  "public-docs/stabilization-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/legal-full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/treasury-risk-status.json",
  "public-docs/treasury-source-status.json",
  "public-docs/treasury-safe-status.json",
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
  issue("configs/treasury-funding-transaction-dry-run.config.json", "Missing treasury transaction dry-run config.");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required treasury transaction dry-run file.");
  }
}

if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  if (config.network?.chainId !== 8453) {
    issue("network.chainId", "Expected Base Mainnet chain ID 8453.");
  }

  if (config.dryRunOnly !== true) {
    issue("dryRunOnly", "Dry run only must remain true.");
  }

  const mustRemainFalse = [
    "safeTransactionPrepared",
    "safeTransactionSubmitted",
    "safeTransactionSigned",
    "safeTransactionExecuted",
    "treasuryFundingTransactionAuthorized",
    "treasuryFundingExecuted",
    "treasurySafeApprovalRecorded",
    "fundingSourceApproved",
    "treasuryRiskLimitsApproved",
    "publicDisclosureApproved"
  ];

  for (const key of mustRemainFalse) {
    if (config[key] !== false) {
      issue(key, "Transaction dry-run item must remain false until separately approved.");
    }
  }

  const plan = config.transactionPlan || {};
  const forbiddenPreparedValues = [
    "calldata",
    "safePayload"
  ];

  for (const key of forbiddenPreparedValues) {
    if (plan[key] && plan[key] !== "not generated") {
      issue(`transactionPlan.${key}`, "Dry run must not generate calldata or Safe payload.");
    }
  }

  if (plan.safeTxHash) {
    issue("transactionPlan.safeTxHash", "Dry run must not have a Safe transaction hash.");
  }

  if (plan.executionTxHash) {
    issue("transactionPlan.executionTxHash", "Dry run must not have an execution transaction hash.");
  }

  for (const [key, value] of Object.entries(config.dryRunCases || {})) {
    if (value !== true) {
      issue(`dryRunCases.${key}`, "Dry-run case expectation must remain true.");
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

const fundingPath = path.join(root, "public-docs", "treasury-funding-status.json");
if (fs.existsSync(fundingPath)) {
  const funding = JSON.parse(fs.readFileSync(fundingPath, "utf8"));

  if (funding.treasuryFundingApproved !== false) {
    issue("treasuryFundingApproved", "Treasury funding must remain not approved.");
  }

  if (funding.treasuryFundingTransactionAuthorized !== false) {
    issue("treasuryFundingTransactionAuthorized", "Treasury funding transaction must remain not authorized.");
  }

  if (funding.treasuryFundingExecuted !== false) {
    issue("treasuryFundingExecuted", "Treasury funding must remain not executed.");
  }
}

const riskPath = path.join(root, "public-docs", "treasury-risk-status.json");
if (fs.existsSync(riskPath)) {
  const risk = JSON.parse(fs.readFileSync(riskPath, "utf8"));

  if (risk.treasuryRiskLimitsApproved !== false) {
    issue("treasuryRiskLimitsApproved", "Treasury risk limits must remain not approved.");
  }

  const limits = risk.effectiveLimits || {};

  for (const key of ["maximumInitialFundingUsd", "maximumSingleTransferUsd", "maximumDailyTransferUsd"]) {
    if (Number(limits[key] || 0) !== 0) {
      issue(`effectiveLimits.${key}`, "Effective funding limits must remain zero.");
    }
  }
}

const sourcePath = path.join(root, "public-docs", "treasury-source-status.json");
if (fs.existsSync(sourcePath)) {
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

  if (source.fundingSourceApproved !== false) {
    issue("fundingSourceApproved", "Funding source must remain not approved.");
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

  if (safe.treasurySafeTransactionExecuted !== false) {
    issue("treasurySafeTransactionExecuted", "Treasury Safe transaction must remain not executed.");
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
  schema: "astra-treasury-funding-transaction-dry-run-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
