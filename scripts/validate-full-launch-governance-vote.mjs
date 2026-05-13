import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "full-launch-governance-vote.config.json");

const requiredFiles = [
  "docs/full-launch-governance-vote/FULL_LAUNCH_GOVERNANCE_VOTE_PACKAGE.md",
  "docs/full-launch-governance-vote/GOVERNANCE_VOTE_SCOPE_TEMPLATE.md",
  "docs/full-launch-governance-vote/GOVERNANCE_RESOLUTION_TEMPLATE.md",
  "docs/full-launch-governance-vote/GOVERNANCE_VOTE_CHECKLIST.md",
  "docs/full-launch-governance-vote/GOVERNANCE_VOTE_DECISION_RECORD.md",
  "docs/full-launch-governance-vote/GOVERNANCE_VOTE_BLOCKERS.md",
  "docs/full-launch-governance-vote/GOVERNANCE_VOTE_PUBLIC_STATUS_TEMPLATE.md",
  "public-docs/stabilization-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/full-launch-governance-status.json",
  "public-docs/treasury-safe-transaction-status.json",
  "public-docs/treasury-funding-status.json",
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
  issue("configs/full-launch-governance-vote.config.json", "Missing governance vote config.");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required governance vote file.");
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

  if (config.governanceVotePackagePrepared !== true) {
    issue("governanceVotePackagePrepared", "Governance vote package should be prepared.");
  }

  const mustRemainFalse = [
    "governanceVoteOpened",
    "governanceVoteCompleted",
    "governanceResolutionPrepared",
    "governanceResolutionSigned",
    "governanceDecisionRecorded",
    "governanceFullLaunchApprovalRecorded",
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
      issue(key, "Governance vote item must remain false until separately approved.");
    }
  }

  for (const [key, value] of Object.entries(config.capabilityApprovals || {})) {
    if (value !== false) {
      issue(`capabilityApprovals.${key}`, "Capability approval must remain false.");
    }
  }

  for (const [key, value] of Object.entries(config.requiredBeforeVoteOpening || {})) {
    if ([
      "restrictedLaunchStabilized",
      "auditClearanceRecorded",
      "legalClearanceRecorded",
      "fullLaunchReadinessTrackExists",
      "fullLaunchGovernanceDecisionPackageReady",
      "treasurySafeTransactionPackageScaffoldReady",
      "mainnetMonitorPassing",
      "activeIncidentsZero"
    ].includes(key)) {
      if (value !== true) {
        issue(`requiredBeforeVoteOpening.${key}`, "Preparation prerequisite should be true.");
      }
    } else if (value !== false) {
      issue(`requiredBeforeVoteOpening.${key}`, "Vote-opening prerequisite must remain false until completed.");
    }
  }

  for (const [key, value] of Object.entries(config.voteChecklist || {})) {
    if (value !== false) {
      issue(`voteChecklist.${key}`, "Vote checklist item must remain false until actual review.");
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

const governancePath = path.join(root, "public-docs", "full-launch-governance-status.json");
if (fs.existsSync(governancePath)) {
  const governance = JSON.parse(fs.readFileSync(governancePath, "utf8"));
  if (governance.governanceFullLaunchApprovalRecorded !== false) {
    issue("governance.governanceFullLaunchApprovalRecorded", "Governance full-launch approval must remain not recorded.");
  }
  if (governance.fullLaunchApproved !== false) {
    issue("governance.fullLaunchApproved", "Full launch must remain not approved.");
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
  schema: "astra-full-launch-governance-vote-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
