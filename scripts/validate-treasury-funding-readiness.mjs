import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "treasury-funding-readiness.config.json");

const requiredFiles = [
  "docs/treasury-funding/TREASURY_FUNDING_READINESS.md",
  "docs/treasury-funding/TREASURY_FUNDING_APPROVAL_MATRIX.md",
  "docs/treasury-funding/SOURCE_OF_FUNDS_TEMPLATE.md",
  "docs/treasury-funding/TREASURY_RISK_LIMITS_TEMPLATE.md",
  "docs/treasury-funding/TREASURY_FUNDING_DECISION_RECORD.md",
  "docs/treasury-funding/TREASURY_FUNDING_BLOCKERS.md",
  "public-docs/stabilization-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/legal-full-launch-status.json",
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
  issue("configs/treasury-funding-readiness.config.json", "Missing treasury funding readiness config.");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required treasury funding file.");
  }
}

if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  if (config.network?.chainId !== 8453) {
    issue("network.chainId", "Expected Base Mainnet chain ID 8453.");
  }

  const mustRemainFalse = [
    "treasuryFundingApproved",
    "treasuryFundingTransactionAuthorized",
    "treasuryFundingExecuted",
    "fundingSourceApproved",
    "treasurySafeApprovalRecorded",
    "riskLimitsApproved",
    "accountingReviewComplete",
    "legalReviewComplete",
    "publicDisclosureUpdated",
    "incidentResponseDrillCurrent"
  ];

  for (const key of mustRemainFalse) {
    if (config[key] !== false) {
      issue(key, "Treasury funding gate must remain false until separately approved.");
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
    issue("incidents.summary.active", "Active incidents must be zero before treasury funding readiness can proceed.");
  }
}

const result = {
  schema: "astra-treasury-funding-readiness-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
