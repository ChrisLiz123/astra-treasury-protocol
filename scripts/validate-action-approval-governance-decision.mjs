import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "action-approval-governance-decision.config.json");

const requiredFiles = [
  "docs/action-approvals/governance-decision/GOVERNANCE_DECISION_ACTION_APPROVAL.md",
  "docs/action-approvals/governance-decision/ACTION_APPROVAL_CHECKLIST.md",
  "docs/action-approvals/governance-decision/ACTION_APPROVAL_RECORD_TEMPLATE.md",
  "docs/action-approvals/governance-decision/ACTION_APPROVAL_BLOCKERS.md",
  "public-docs/launch-control-status.json",
  "public-docs/stabilization-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/full-launch-governance-decision-recording-status.json",
  "public-docs/full-launch-governance-decision-recording-authorization-status.json",
  "public-docs/full-launch-governance-resolution-status.json",
  "public-docs/full-launch-governance-resolution-authorization-status.json",
  "public-docs/treasury-safe-transaction-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-alerts-status.json",
  "public-docs/incident-summary.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
  "reports/action-approvals/governance-decision/action-approved.json",
  "reports/action-approvals/governance-decision/governance-decision-recorded.json",
  "public-docs/governance-decision-approved.json",
  "public-docs/full-launch-approved.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

if (!fs.existsSync(configPath)) {
  issue("configs/action-approval-governance-decision.config.json", "Missing action approval config.");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required action approval file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden approval/decision file exists. This milestone must not approve or record the action.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/action-approval-governance-decision.config.json");
  const launchControl = readJson("public-docs/launch-control-status.json");
  const stabilization = readJson("public-docs/stabilization-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const decisionRecording = readJson("public-docs/full-launch-governance-decision-recording-status.json");
  const decisionAuthorization = readJson("public-docs/full-launch-governance-decision-recording-authorization-status.json");
  const resolution = readJson("public-docs/full-launch-governance-resolution-status.json");
  const resolutionAuthorization = readJson("public-docs/full-launch-governance-resolution-authorization-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const safeTx = readJson("public-docs/treasury-safe-transaction-status.json");
  const monitor = readJson("public-docs/mainnet-monitor-status.json");
  const alerts = readJson("public-docs/mainnet-alerts-status.json");
  const incidents = readJson("public-docs/incident-summary.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.selectedAction?.id !== "governance-decision-recording") {
    issue("selectedAction.id", "Expected selected action governance-decision-recording.");
  }

  if (config.operatorReportedClearances?.auditCleared !== true) {
    issue("operatorReportedClearances.auditCleared", "Audit clearance should be recorded.");
  }

  if (config.operatorReportedClearances?.legalCleared !== true) {
    issue("operatorReportedClearances.legalCleared", "Legal clearance should be recorded.");
  }

  if (launchControl.additionalGenericPreparationRecommended !== false) {
    issue("launchControl.additionalGenericPreparationRecommended", "Generic preparation should remain stopped.");
  }

  if (stabilization.status !== "RESTRICTED_LAUNCH_STABILIZED") {
    issue("stabilization.status", `Expected RESTRICTED_LAUNCH_STABILIZED, got ${stabilization.status}`);
  }

  if (monitor.status !== "PASS") {
    issue("mainnetMonitor.status", `Expected PASS, got ${monitor.status}`);
  }

  if (alerts.responseRequired === true) {
    issue("alerts.responseRequired", "Alerts must not require response.");
  }

  if (Number(incidents?.summary?.active || 0) !== 0) {
    issue("incidents.summary.active", "Active incidents must be zero.");
  }

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("mainnetExecution.mode", "Mainnet execution queue must remain disabled.");
  }

  const mustRemainFalse = [
    "actionSpecificApprovalRequested",
    "actionSpecificApprovalRecorded",
    "actionSpecificApprovalExecuted",
    "governanceDecisionRecordingAuthorized",
    "governanceDecisionRecorded",
    "governanceDecisionPublished",
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
      issue(key, "Action approval item must remain false until separately approved.");
    }
  }

  if (decisionRecording.governanceDecisionRecorded !== false) {
    issue("decisionRecording.governanceDecisionRecorded", "Governance decision must remain not recorded.");
  }

  if (decisionAuthorization.decisionRecordingAuthorizationRecorded !== false) {
    issue("decisionAuthorization.decisionRecordingAuthorizationRecorded", "Decision recording authorization must remain not recorded.");
  }

  if (resolution.governanceResolutionSigned !== false) {
    issue("resolution.governanceResolutionSigned", "Governance resolution must remain not signed.");
  }

  if (resolutionAuthorization.resolutionSigningAuthorizationRecorded !== false) {
    issue("resolutionAuthorization.resolutionSigningAuthorizationRecorded", "Resolution signing authorization must remain not recorded.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false) {
    issue("treasuryFundingApproved", "Treasury funding must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFundingExecuted", "Treasury funding must remain not executed.");
  }

  if (safeTx.safeTransactionPayloadGenerated !== false) {
    issue("safeTransactionPayloadGenerated", "Safe payload must remain not generated.");
  }

  if (safeTx.safeTransactionPrepared !== false) {
    issue("safeTransactionPrepared", "Safe transaction must remain not prepared.");
  }

  for (const [key, value] of Object.entries(config.capabilityApprovals || {})) {
    if (value !== false) {
      issue(`capabilityApprovals.${key}`, "Capability approval must remain false.");
    }
  }

  for (const [key, value] of Object.entries(config.approvalChecklist || {})) {
    if (value !== false) {
      issue(`approvalChecklist.${key}`, "Approval checklist item must remain false until actual approval.");
    }
  }

  for (const [key, value] of Object.entries(config.dryRunCases || {})) {
    if (value !== true) {
      issue(`dryRunCases.${key}`, "Dry-run case expectation must remain true.");
    }
  }
}

const result = {
  schema: "astra-action-specific-governance-decision-approval-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
