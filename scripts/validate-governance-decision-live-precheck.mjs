import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "configs/governance-decision-live-precheck.config.json",
  "docs/action-approvals/governance-decision-live-precheck/GOVERNANCE_DECISION_LIVE_PRECHECK.md",
  "docs/action-approvals/governance-decision-live-precheck/LIVE_PRECHECK_DECISION_RECORD.md",
  "docs/action-approvals/governance-decision-live-precheck/LIVE_PRECHECK_BLOCKERS.md",
  "public-docs/launch-control-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/public-status-update-status.json",
  "public-docs/governance-decision-approval-status.json",
  "public-docs/governance-vote-result-evidence-status.json",
  "public-docs/signed-governance-resolution-evidence-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/full-launch-governance-decision-recording-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/treasury-safe-transaction-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-alerts-status.json",
  "public-docs/incident-summary.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
  "reports/governance-decision-live-precheck/governance-decision-recorded.json",
  "reports/full-launch-governance-decision/governance-decision-recorded.json",
  "reports/full-launch-governance-decision/full-launch-approved.json",
  "public-docs/full-launch-governance-decision-recorded.json",
  "public-docs/full-launch-approved.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required governance decision live precheck file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden governance-decision/full-launch approval file exists. This precheck must not record a decision.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/governance-decision-live-precheck.config.json");
  const launchControl = readJson("public-docs/launch-control-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const publicStatusUpdate = readJson("public-docs/public-status-update-status.json");
  const actionApproval = readJson("public-docs/governance-decision-approval-status.json");
  const voteEvidence = readJson("public-docs/governance-vote-result-evidence-status.json");
  const signedResolutionEvidence = readJson("public-docs/signed-governance-resolution-evidence-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const decisionRecording = readJson("public-docs/full-launch-governance-decision-recording-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const safeTx = readJson("public-docs/treasury-safe-transaction-status.json");
  const monitor = readJson("public-docs/mainnet-monitor-status.json");
  const alerts = readJson("public-docs/mainnet-alerts-status.json");
  const incidents = readJson("public-docs/incident-summary.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.network?.chainId !== 8453) {
    issue("network.chainId", "Expected Base Mainnet chain ID 8453.");
  }

  if (config.precheckOnly !== true) {
    issue("precheckOnly", "Precheck must remain precheck only.");
  }

  if (config.livePrecheckFrameworkPrepared !== true) {
    issue("livePrecheckFrameworkPrepared", "Live precheck framework should be prepared.");
  }

  const mustRemainFalse = [
    "readyToRecordGovernanceDecision",
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
      issue(key, "Config must remain false for live precheck framework.");
    }
  }

  for (const [key, value] of Object.entries(config.capabilityApprovals || {})) {
    if (value !== false) {
      issue(`capabilityApprovals.${key}`, "Capability approval must remain false.");
    }
  }

  for (const [key, value] of Object.entries(config.hardStops || {})) {
    if (value !== false) {
      issue(`hardStops.${key}`, "Hard stop must remain false.");
    }
  }

  if (launchControl.additionalGenericPreparationRecommended !== false) {
    issue("launchControl.additionalGenericPreparationRecommended", "Generic preparation should remain stopped.");
  }

  if (capabilityMatrix.capabilityMatrixFinalized !== true) {
    issue("capabilityMatrix.capabilityMatrixFinalized", "Capability matrix must be finalized.");
  }

  if (capabilityMatrix.allCapabilitiesDisabled !== true) {
    issue("capabilityMatrix.allCapabilitiesDisabled", "Capability matrix must keep all capabilities disabled.");
  }

  if (capabilityMatrix.allCapabilityApprovalsFalse !== true) {
    issue("capabilityMatrix.allCapabilityApprovalsFalse", "Capability matrix must keep all approvals false.");
  }

  if (publicStatusUpdate.publicStatusUpdateFinalApproved !== true) {
    issue("publicStatusUpdate.publicStatusUpdateFinalApproved", "Public status update must be finalized.");
  }

  if (voteEvidence.status === "GOVERNANCE_VOTE_RESULT_EVIDENCE_REVIEW_REQUIRED") {
    issue("voteEvidence.status", "Vote/result evidence is in review-required state.");
  }

  if (signedResolutionEvidence.status === "SIGNED_GOVERNANCE_RESOLUTION_EVIDENCE_REVIEW_REQUIRED") {
    issue("signedResolutionEvidence.status", "Signed-resolution evidence is in review-required state.");
  }

  if (actionApproval.status === "ACTION_SPECIFIC_APPROVAL_PATH_REVIEW_REQUIRED") {
    issue("actionApproval.status", "Governance decision action approval is in review-required state.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (decisionRecording.governanceDecisionRecorded !== false) {
    issue("decisionRecording.governanceDecisionRecorded", "Governance decision must remain not recorded.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false) {
    issue("treasuryFunding.treasuryFundingApproved", "Treasury funding must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding.treasuryFundingExecuted", "Treasury funding must remain not executed.");
  }

  if (safeTx.safeTransactionPayloadGenerated !== false) {
    issue("safeTx.safeTransactionPayloadGenerated", "Safe payload must remain not generated.");
  }

  if (safeTx.safeTransactionPrepared !== false) {
    issue("safeTx.safeTransactionPrepared", "Safe transaction must remain not prepared.");
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
}

const result = {
  schema: "astra-governance-decision-live-precheck-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
