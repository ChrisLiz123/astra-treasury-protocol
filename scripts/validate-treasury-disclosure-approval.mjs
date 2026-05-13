import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "treasury-disclosure-approval.config.json");

const requiredFiles = [
  "docs/treasury-disclosure/TREASURY_DISCLOSURE_APPROVAL_PACKAGE.md",
  "docs/treasury-disclosure/TREASURY_DISCLOSURE_APPROVAL_CHECKLIST.md",
  "docs/treasury-disclosure/TREASURY_DISCLOSURE_APPROVAL_RECORD.md",
  "docs/treasury-disclosure/TREASURY_PUBLIC_DISCLOSURE_FINAL_REVIEW.md",
  "docs/treasury-disclosure/TREASURY_DISCLOSURE_BLOCKERS.md",
  "public-docs/disclosures-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/treasury-risk-status.json",
  "public-docs/treasury-source-status.json",
  "public-docs/treasury-safe-status.json",
  "public-docs/treasury-transaction-dry-run-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/legal-full-launch-status.json",
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
  issue("configs/treasury-disclosure-approval.config.json", "Missing Treasury Disclosure approval config.");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required Treasury Disclosure approval file.");
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
    "treasuryDisclosureApprovalRequested",
    "treasuryDisclosureApprovalRecorded",
    "treasuryDisclosureFinalApproved",
    "treasuryFundingApproved",
    "treasuryFundingTransactionAuthorized",
    "treasuryFundingExecuted",
    "treasurySafeApprovalRecorded",
    "fundingSourceApproved",
    "treasuryRiskLimitsApproved"
  ];

  for (const key of mustRemainFalse) {
    if (config[key] !== false) {
      issue(key, "Treasury disclosure item must remain false until separately approved.");
    }
  }

  for (const [key, value] of Object.entries(config.requiredBeforeTreasuryDisclosureApproval || {})) {
    if ([
      "currentPublicDisclosureDraftExists",
      "riskDisclosureDraftExists",
      "treasuryFundingSourceReviewExists",
      "treasuryRiskLimitsDraftExists",
      "treasurySafeApprovalPackageExists",
      "treasuryTransactionDryRunPassed"
    ].includes(key)) {
      if (value !== true) {
        issue(`requiredBeforeTreasuryDisclosureApproval.${key}`, "Expected preparation prerequisite to be true.");
      }
    } else if (value !== false) {
      issue(`requiredBeforeTreasuryDisclosureApproval.${key}`, "Approval prerequisite must remain false until separately approved.");
    }
  }

  for (const [key, value] of Object.entries(config.approvalChecklist || {})) {
    if (value !== false) {
      issue(`approvalChecklist.${key}`, "Disclosure approval checklist item must remain false until final review.");
    }
  }

  for (const [key, value] of Object.entries(config.hardStops || {})) {
    if (value !== false) {
      issue(`hardStops.${key}`, "Hard stop must remain false.");
    }
  }
}

const disclosuresPath = path.join(root, "public-docs", "disclosures-status.json");
if (fs.existsSync(disclosuresPath)) {
  const disclosures = JSON.parse(fs.readFileSync(disclosuresPath, "utf8"));

  if (disclosures.status !== "PUBLIC_DISCLOSURE_UPDATE_DRAFT_READY_NOT_APPROVED") {
    issue("disclosures.status", `Expected PUBLIC_DISCLOSURE_UPDATE_DRAFT_READY_NOT_APPROVED, got ${disclosures.status}`);
  }

  if (disclosures.publicDisclosuresApproved !== false) {
    issue("disclosures.publicDisclosuresApproved", "Public disclosures must remain not final-approved.");
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

  if (tx.treasuryFundingTransactionAuthorized !== false) {
    issue("treasuryTransactionDryRun.treasuryFundingTransactionAuthorized", "Funding transaction must remain not authorized.");
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

const riskPath = path.join(root, "public-docs", "treasury-risk-status.json");
if (fs.existsSync(riskPath)) {
  const risk = JSON.parse(fs.readFileSync(riskPath, "utf8"));

  if (risk.treasuryRiskLimitsApproved !== false) {
    issue("treasuryRiskLimitsApproved", "Treasury risk limits must remain not approved.");
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
  schema: "astra-treasury-disclosure-approval-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
