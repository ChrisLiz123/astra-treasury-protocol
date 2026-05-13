import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "full-launch-governance-decision-recording-authorization.config.json");

const requiredFiles = [
  "docs/full-launch-governance-decision-recording-authorization/GOVERNANCE_DECISION_RECORDING_AUTHORIZATION_PACKAGE.md",
  "docs/full-launch-governance-decision-recording-authorization/GOVERNANCE_DECISION_RECORDING_AUTHORIZATION_CHECKLIST.md",
  "docs/full-launch-governance-decision-recording-authorization/GOVERNANCE_DECISION_RECORDING_AUTHORIZATION_RECORD.md",
  "docs/full-launch-governance-decision-recording-authorization/GOVERNANCE_DECISION_AUTHORIZATION_EVIDENCE_PLAN.md",
  "docs/full-launch-governance-decision-recording-authorization/GOVERNANCE_DECISION_AUTHORIZATION_DRY_RUN_CASES.md",
  "docs/full-launch-governance-decision-recording-authorization/GOVERNANCE_DECISION_AUTHORIZATION_BLOCKERS.md",
  "docs/full-launch-governance-decision-recording-authorization/GOVERNANCE_DECISION_AUTHORIZATION_PUBLIC_STATUS_TEMPLATE.md",
  "public-docs/stabilization-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/full-launch-governance-status.json",
  "public-docs/full-launch-governance-vote-status.json",
  "public-docs/full-launch-governance-vote-opening-status.json",
  "public-docs/full-launch-governance-vote-authorization-status.json",
  "public-docs/full-launch-governance-vote-opening-execution-status.json",
  "public-docs/full-launch-governance-resolution-status.json",
  "public-docs/full-launch-governance-resolution-authorization-status.json",
  "public-docs/full-launch-governance-decision-recording-status.json",
  "public-docs/treasury-safe-transaction-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-alerts-status.json",
  "public-docs/incident-summary.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenAuthorizationFiles = [
  "reports/full-launch-governance-decision/decision-recording-authorization.json",
  "reports/full-launch-governance-decision/governance-decision-recorded.json",
  "reports/full-launch-governance-decision/full-launch-approved.json",
  "public-docs/full-launch-governance-decision-recording-authorization-recorded.json",
  "public-docs/full-launch-governance-decision-recorded.json",
  "public-docs/full-launch-approved.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

if (!fs.existsSync(configPath)) {
  issue("configs/full-launch-governance-decision-recording-authorization.config.json", "Missing governance decision recording authorization config.");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required governance decision recording authorization file.");
  }
}

for (const file of forbiddenAuthorizationFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden authorization/recorded-decision/approval file exists. This milestone must not record authorization or a decision.");
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

  if (config.decisionRecordingAuthorizationPackagePrepared !== true) {
    issue("decisionRecordingAuthorizationPackagePrepared", "Decision recording authorization package should be prepared.");
  }

  if (config.authorizationEvidencePlanPrepared !== true) {
    issue("authorizationEvidencePlanPrepared", "Authorization evidence plan should be prepared.");
  }

  const mustRemainFalse = [
    "decisionRecordingAuthorizationRequested",
    "decisionRecordingAuthorizationRecorded",
    "decisionRecordingAuthorized",
    "governanceDecisionRecordingAuthorized",
    "governanceDecisionRecorded",
    "governanceDecisionPublished",
    "governanceResolutionSigned",
    "resolutionSigningAuthorizationRecorded",
    "governanceFullLaunchApprovalRecorded",
    "governanceVoteAuthorizationRecorded",
    "governanceVoteOpened",
    "governanceVoteCompleted",
    "governanceVoteResultRecorded",
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
      issue(key, "Decision authorization item must remain false.");
    }
  }

  for (const [key, value] of Object.entries(config.capabilityApprovals || {})) {
    if (value !== false) {
      issue(`capabilityApprovals.${key}`, "Capability approval must remain false.");
    }
  }

  const record = config.draftAuthorizationRecord || {};
  if (record.decision !== "NOT AUTHORIZED") {
    issue("draftAuthorizationRecord.decision", "Draft authorization decision must remain NOT AUTHORIZED.");
  }

  if (Array.isArray(record.approvedCapabilities) && record.approvedCapabilities.length !== 0) {
    issue("draftAuthorizationRecord.approvedCapabilities", "Approved capabilities must remain empty.");
  }

  if (record.authorizationDate) {
    issue("draftAuthorizationRecord.authorizationDate", "Authorization date must remain empty.");
  }

  for (const [key, value] of Object.entries(config.requiredBeforeDecisionRecordingAuthorization || {})) {
    if ([
      "restrictedLaunchStabilized",
      "auditClearanceRecorded",
      "legalClearanceRecorded",
      "governanceDecisionRecordingPackageReady",
      "resolutionSigningAuthorizationPackageReady",
      "governanceResolutionSigningPackageReady",
      "governanceVotePackageReady",
      "governanceVoteOpeningPackageReady",
      "governanceVoteAuthorizationPackageReady",
      "governanceVoteOpeningExecutionPackageReady",
      "mainnetMonitorPassing",
      "activeIncidentsZero"
    ].includes(key)) {
      if (value !== true) {
        issue(`requiredBeforeDecisionRecordingAuthorization.${key}`, "Preparation prerequisite should be true.");
      }
    } else if (value !== false) {
      issue(`requiredBeforeDecisionRecordingAuthorization.${key}`, "Decision authorization prerequisite must remain false until completed.");
    }
  }

  for (const [key, value] of Object.entries(config.authorizationChecklist || {})) {
    if (value !== false) {
      issue(`authorizationChecklist.${key}`, "Authorization checklist item must remain false until actual review.");
    }
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

const decisionPath = path.join(root, "public-docs", "full-launch-governance-decision-recording-status.json");
if (fs.existsSync(decisionPath)) {
  const decision = JSON.parse(fs.readFileSync(decisionPath, "utf8"));
  if (decision.governanceDecisionRecorded !== false) {
    issue("decisionRecording.governanceDecisionRecorded", "Governance decision must remain not recorded.");
  }
  if (decision.fullLaunchApproved !== false) {
    issue("decisionRecording.fullLaunchApproved", "Full launch must remain not approved.");
  }
}

const resolutionAuthPath = path.join(root, "public-docs", "full-launch-governance-resolution-authorization-status.json");
if (fs.existsSync(resolutionAuthPath)) {
  const auth = JSON.parse(fs.readFileSync(resolutionAuthPath, "utf8"));
  if (auth.resolutionSigningAuthorizationRecorded !== false) {
    issue("resolutionAuthorization.resolutionSigningAuthorizationRecorded", "Resolution signing authorization must remain not recorded.");
  }
  if (auth.governanceResolutionSigned !== false) {
    issue("resolutionAuthorization.governanceResolutionSigned", "Resolution must remain not signed.");
  }
}

const resolutionPath = path.join(root, "public-docs", "full-launch-governance-resolution-status.json");
if (fs.existsSync(resolutionPath)) {
  const resolution = JSON.parse(fs.readFileSync(resolutionPath, "utf8"));
  if (resolution.governanceResolutionSigned !== false) {
    issue("resolution.governanceResolutionSigned", "Resolution must remain not signed.");
  }
  if (resolution.governanceDecisionRecorded !== false) {
    issue("resolution.governanceDecisionRecorded", "Governance decision must remain not recorded.");
  }
}

const votePath = path.join(root, "public-docs", "full-launch-governance-vote-status.json");
if (fs.existsSync(votePath)) {
  const vote = JSON.parse(fs.readFileSync(votePath, "utf8"));
  if (vote.governanceVoteOpened !== false) {
    issue("governanceVote.governanceVoteOpened", "Vote must remain not opened.");
  }
  if (vote.governanceDecisionRecorded !== false) {
    issue("governanceVote.governanceDecisionRecorded", "Governance decision must remain not recorded.");
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
  schema: "astra-full-launch-governance-decision-recording-authorization-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
