import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "treasury-funding-source-review.config.json");

const requiredFiles = [
  "docs/treasury-source/TREASURY_FUNDING_SOURCE_REVIEW.md",
  "docs/treasury-source/SOURCE_OF_FUNDS_REVIEW_TEMPLATE.md",
  "docs/treasury-source/FUNDING_ASSET_DUE_DILIGENCE.md",
  "docs/treasury-source/SANCTIONS_AND_COMPLIANCE_REVIEW_TEMPLATE.md",
  "docs/treasury-source/FUNDING_SOURCE_DECISION_RECORD.md",
  "docs/treasury-source/TREASURY_SOURCE_CONFIDENTIALITY_POLICY.md",
  "docs/treasury-source/TREASURY_SOURCE_REVIEW_BLOCKERS.md",
  "public-docs/stabilization-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/legal-full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/treasury-risk-status.json",
  "public-docs/disclosures-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/incident-summary.json",
  "public-docs/mainnet-execution-status.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

if (!fs.existsSync(configPath)) {
  issue("configs/treasury-funding-source-review.config.json", "Missing treasury funding source review config.");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required treasury source review file.");
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
    "sourceReviewApproved",
    "fundingSourceApproved",
    "sourceOfFundsDocumented",
    "sourceComplianceReviewed",
    "sourceAccountingReviewed",
    "sourceSanctionsReviewed",
    "fundingAssetApproved",
    "fundingSenderApproved",
    "fundingDestinationApproved",
    "treasuryFundingApproved",
    "treasuryFundingTransactionAuthorized",
    "treasuryFundingExecuted"
  ];

  for (const key of mustRemainFalse) {
    if (config[key] !== false) {
      issue(key, "Source review item must remain false until separately approved.");
    }
  }

  for (const [key, value] of Object.entries(config.hardStops || {})) {
    if (value !== false) {
      issue(`hardStops.${key}`, "Hard stop must remain false.");
    }
  }

  for (const [key, value] of Object.entries(config.confidentiality || {})) {
    if (value !== true) {
      issue(`confidentiality.${key}`, "Confidentiality safeguards must remain true.");
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

const executionPath = path.join(root, "public-docs", "mainnet-execution-status.json");
if (fs.existsSync(executionPath)) {
  const execution = JSON.parse(fs.readFileSync(executionPath, "utf8"));

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("mainnetExecution.mode", "Mainnet execution queue must remain disabled.");
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
  schema: "astra-treasury-funding-source-review-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
