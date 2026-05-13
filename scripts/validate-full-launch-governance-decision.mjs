import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "full-launch-governance-decision.config.json");

const requiredFiles = [
  "docs/full-launch-governance/FULL_LAUNCH_GOVERNANCE_DECISION_PACKAGE.md",
  "docs/full-launch-governance/GOVERNANCE_DECISION_CHECKLIST.md",
  "docs/full-launch-governance/FULL_LAUNCH_GOVERNANCE_DECISION_RECORD.md",
  "docs/full-launch-governance/CAPABILITY_ACTIVATION_MATRIX.md",
  "docs/full-launch-governance/FULL_LAUNCH_GOVERNANCE_BLOCKERS.md",
  "docs/full-launch-governance/GOVERNANCE_PUBLIC_STATUS_UPDATE_TEMPLATE.md",
  "public-docs/stabilization-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/legal-full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/treasury-risk-status.json",
  "public-docs/treasury-source-status.json",
  "public-docs/treasury-safe-status.json",
  "public-docs/treasury-transaction-dry-run-status.json",
  "public-docs/treasury-disclosure-status.json",
  "public-docs/treasury-safe-transaction-status.json",
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
  issue("configs/full-launch-governance-decision.config.json", "Missing full-launch governance decision config.");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required full-launch governance decision file.");
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

  if (config.governanceDecisionPackagePrepared !== true) {
    issue("governanceDecisionPackagePrepared", "Governance decision package should be prepared.");
  }

  const mustRemainFalse = [
    "governanceFullLaunchApprovalRequested",
    "governanceFullLaunchApprovalRecorded",
    "governanceDecisionRecorded",
    "fullLaunchApproved",
    "publicDisclosuresFinalApproved",
    "treasuryDisclosureFinalApproved",
    "treasuryFundingApproved",
    "treasuryFundingTransactionAuthorized",
    "treasuryFundingExecuted",
    "safeTransactionPayloadGenerated",
    "safeTransactionPrepared",
    "safeTransactionSubmitted",
    "safeTransactionSigned",
    "safeTransactionExecuted"
  ];

  for (const key of mustRemainFalse) {
    if (config[key] !== false) {
      issue(key, "Governance decision item must remain false until separately approved.");
    }
  }

  for (const [key, value] of Object.entries(config.capabilityApprovals || {})) {
    if (value !== false) {
      issue(`capabilityApprovals.${key}`, "Capability approval must remain false.");
    }
  }

  for (const [key, value] of Object.entries(config.requiredBeforeGovernanceDecision || {})) {
    if ([
      "restrictedLaunchStabilized",
      "auditClearanceRecorded",
      "legalClearanceRecorded",
      "fullLaunchReadinessTrackExists",
      "legalFullLaunchReviewExists",
      "treasuryFundingReadinessExists",
      "treasuryRiskLimitsDraftExists",
      "treasuryFundingSourceReviewExists",
      "treasurySafeApprovalPackageExists",
      "treasuryTransactionDryRunPassed",
      "treasuryDisclosureApprovalTrackExists",
      "treasurySafeTransactionPackageScaffoldExists",
      "mainnetMonitorPassing",
      "activeIncidentsZero"
    ].includes(key)) {
      if (value !== true) {
        issue(`requiredBeforeGovernanceDecision.${key}`, "Preparation prerequisite should be true.");
      }
    } else if (value !== false) {
      issue(`requiredBeforeGovernanceDecision.${key}`, "Final governance prerequisite must remain false until completed.");
    }
  }

  for (const [key, value] of Object.entries(config.governanceDecisionChecklist || {})) {
    if (value !== false) {
      issue(`governanceDecisionChecklist.${key}`, "Governance checklist item must remain false until final review.");
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

const fullLaunchPath = path.join(root, "public-docs", "full-launch-status.json");
if (fs.existsSync(fullLaunchPath)) {
  const fullLaunch = JSON.parse(fs.readFileSync(fullLaunchPath, "utf8"));
  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }
}

const safeTxPath = path.join(root, "public-docs", "treasury-safe-transaction-status.json");
if (fs.existsSync(safeTxPath)) {
  const safeTx = JSON.parse(fs.readFileSync(safeTxPath, "utf8"));
  if (safeTx.safeTransactionPayloadGenerated !== false) {
    issue("treasurySafeTransaction.safeTransactionPayloadGenerated", "Safe payload must remain not generated.");
  }
  if (safeTx.safeTransactionPrepared !== false) {
    issue("treasurySafeTransaction.safeTransactionPrepared", "Safe transaction must remain not prepared.");
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
  schema: "astra-full-launch-governance-decision-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
