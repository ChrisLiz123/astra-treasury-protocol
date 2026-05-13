import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const confirmation = process.env.GOVERNANCE_DECISION_ACTION_APPROVAL_CONFIRM || "";
const approver = process.env.ACTION_APPROVER || "";
const decisionRecorder = process.env.DECISION_RECORDER || "";

const requiredConfirmation = "RECORD_ACTION_APPROVAL_ONLY";

const recordDir = path.join(root, "reports", "action-approvals", "governance-decision");
const recordFile = path.join(recordDir, "action-approval-record.json");
const configFile = path.join(root, "configs", "action-approval-governance-decision.config.json");

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readJsonFull(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function isPlaceholder(value) {
  const normalized = String(value || "").trim().toLowerCase();

  return (
    normalized.length === 0 ||
    normalized === "tbd" ||
    normalized.includes("tbd") ||
    normalized.includes("todo") ||
    normalized.includes("placeholder") ||
    normalized.includes("paste_") ||
    normalized === "not imported" ||
    normalized === "yyyy-mm-ddthh:mm:ssz"
  );
}

function requireTrue(pathName, condition, message) {
  if (!condition) {
    issue(pathName, message);
  }
}

if (confirmation !== requiredConfirmation) {
  issue(
    "GOVERNANCE_DECISION_ACTION_APPROVAL_CONFIRM",
    `Must equal ${requiredConfirmation}. This prevents accidental approval recording.`
  );
}

if (isPlaceholder(approver)) {
  issue("ACTION_APPROVER", "Set ACTION_APPROVER to a real approver name or governance reference.");
}

if (isPlaceholder(decisionRecorder)) {
  issue("DECISION_RECORDER", "Set DECISION_RECORDER to the real decision recorder name or governance reference.");
}

const currentConfig = readJsonFull(configFile);
const resolutionOnlyMode = currentConfig.governanceProcessMode === "resolution-only";

const launchControl = readJson("public-docs/launch-control-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const publicStatusUpdate = readJson("public-docs/public-status-update-status.json");
const voteEvidence = readJson("public-docs/governance-vote-result-evidence-status.json");
const signedResolutionEvidence = readJson("public-docs/signed-governance-resolution-evidence-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const safeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireTrue(
  "launchControl.status",
  launchControl.status === "LAUNCH_CONTROL_READY_RESTRICTED_MODE",
  "Launch Control must be ready in restricted mode."
);

requireTrue(
  "capabilityMatrix.capabilityMatrixFinalized",
  capabilityMatrix.capabilityMatrixFinalized === true &&
    capabilityMatrix.allCapabilitiesDisabled === true &&
    capabilityMatrix.allCapabilityApprovalsFalse === true,
  "Capability Matrix must be finalized as all-disabled."
);

requireTrue(
  "publicStatusUpdate.publicStatusUpdateFinalApproved",
  publicStatusUpdate.publicStatusUpdateFinalApproved === true &&
    publicStatusUpdate.doesNotApproveCapabilities === true &&
    publicStatusUpdate.fullLaunchApproved === false &&
    publicStatusUpdate.governanceDecisionRecorded === false,
  "Public Status Update must be finalized for restricted-mode / all-disabled status."
);

requireTrue(
  "voteEvidence",
  resolutionOnlyMode || (
    voteEvidence.voteResultImported === true &&
    voteEvidence.voteResultValidated === true &&
    voteEvidence.voteResultRecorded === true
  ),
  resolutionOnlyMode
    ? "Resolution-only governance does not require separate vote/result evidence."
    : "Vote/result evidence must be imported, validated, and recorded as evidence."
);

requireTrue(
  "signedResolutionEvidence",
  signedResolutionEvidence.signedResolutionEvidenceImported === true &&
    signedResolutionEvidence.signedResolutionValidated === true &&
    signedResolutionEvidence.signedGovernanceResolutionExists === true &&
    signedResolutionEvidence.resolutionSigningAuthorizationRecorded === true,
  "Signed governance resolution evidence and resolution signing authorization evidence must be imported and validated."
);

requireTrue(
  "monitor.status",
  monitor.status === "PASS",
  "Mainnet monitor must be passing."
);

requireTrue(
  "alerts.responseRequired",
  alerts.responseRequired !== true,
  "Alerts must not require response."
);

requireTrue(
  "incidents.summary.active",
  Number(incidents?.summary?.active || 0) === 0,
  "Active incidents must be zero."
);

requireTrue(
  "execution.mode",
  execution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED",
  "Mainnet execution queue must remain disabled."
);

requireTrue(
  "fullLaunch.fullLaunchApproved",
  fullLaunch.fullLaunchApproved === false,
  "Full launch must remain not approved by this action approval."
);

requireTrue(
  "treasuryFunding.treasuryFundingApproved",
  treasuryFunding.treasuryFundingApproved === false,
  "Treasury funding must remain not approved by this action approval."
);

requireTrue(
  "treasuryFunding.treasuryFundingExecuted",
  treasuryFunding.treasuryFundingExecuted === false,
  "Treasury funding must remain not executed."
);

requireTrue(
  "safeTx.safeTransactionPayloadGenerated",
  safeTx.safeTransactionPayloadGenerated === false,
  "Safe payload must remain not generated."
);

requireTrue(
  "safeTx.safeTransactionPrepared",
  safeTx.safeTransactionPrepared === false,
  "Safe transaction must remain not prepared."
);

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-governance-decision-action-approval-recording-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_ACTION_APPROVAL_NOT_RECORDED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const disabledCapabilities = [
  "publicTokenSale",
  "realTreasuryFunding",
  "stakingOrRewards",
  "buybackProgram",
  "mainnetExecutionQueue",
  "paperToOnchainAutomation",
  "autonomousExecution",
  "safeTransactionPayloadGeneration",
  "safeTransactionExecution"
];

const record = {
  schema: "astra-governance-decision-action-approval-record-v0.1",
  recordedAt: new Date().toISOString(),
  status: "GOVERNANCE_DECISION_ACTION_APPROVAL_RECORDED_NOT_DECISION",
  actionId: "governance-decision-recording",
  approvalRecorded: true,
  actionApprover: approver,
  decisionRecorder,
  evidenceReferences: {
    voteResultEvidence: resolutionOnlyMode ? "not-applicable-resolution-only" : "public-docs/governance-vote-result-evidence-status.json",
    signedResolutionEvidence: "public-docs/signed-governance-resolution-evidence-status.json",
    capabilityMatrix: "public-docs/capability-matrix-status.json",
    publicStatusUpdate: "public-docs/public-status-update-status.json",
    launchControl: "public-docs/launch-control-status.json"
  },
  approvedCapabilities: [],
  disabledCapabilities,
  governanceDecisionRecorded: false,
  fullLaunchApproved: false,
  treasuryFundingApproved: false,
  safeTransactionPayloadGenerated: false,
  mainnetExecutionQueueEnabled: false,
  safety: {
    sendsTransactions: false,
    movesFunds: false,
    deploysContracts: false,
    enablesExecution: false,
    approvesPublicSale: false,
    approvesTreasuryFunding: false,
    preparesSafeTransaction: false,
    recordsGovernanceDecision: false,
    approvesFullLaunch: false
  }
};

writeJson(recordFile, record);

const config = readJsonFull(configFile);

config.actionSpecificApprovalRecorded = true;
config.governanceDecisionRecordingAuthorized = true;
config.actionSpecificApprovalExecuted = false;
config.governanceDecisionRecorded = false;
config.governanceDecisionPublished = false;
config.fullLaunchApproved = false;
config.treasuryFundingApproved = false;
config.treasuryFundingTransactionAuthorized = false;
config.treasuryFundingExecuted = false;
config.safeTransactionPayloadGenerated = false;
config.safeTransactionPrepared = false;
config.safeTransactionSubmitted = false;
config.safeTransactionSigned = false;
config.safeTransactionExecuted = false;

config.requiredBeforeActionApproval = {
  ...(config.requiredBeforeActionApproval || {}),
  launchControlReady: true,
  restrictedLaunchStabilized: true,
  auditClearanceRecorded: true,
  legalClearanceRecorded: true,
  mainnetMonitorPassing: true,
  activeIncidentsZero: true,
  governanceDecisionRecordingPackageReady: true,
  governanceDecisionRecordingAuthorizationPackageReady: true,
  signedGovernanceResolutionExists: true,
  voteResultRecorded: true,
  resolutionSigningAuthorizationRecorded: true,
  capabilityMatrixFinalApproved: true,
  publicStatusUpdateFinalApproved: true,
  decisionRecorderAssigned: true,
  finalActionApprovalRecorded: true
};

config.draftApprovalRecord = {
  ...(config.draftApprovalRecord || {}),
  decision: "APPROVED_FOR_GOVERNANCE_DECISION_RECORDING_ONLY",
  actionId: "governance-decision-recording",
  approvalDate: record.recordedAt,
  approver,
  decisionRecorder,
  decisionRecordReference: "pending-live-recording",
  resolutionReference: signedResolutionEvidence.evidenceSummary?.resolutionReference || "public-docs/signed-governance-resolution-evidence-status.json",
  voteResult: resolutionOnlyMode
    ? "not-applicable-resolution-only"
    : (voteEvidence.evidenceSummary?.result || "public-docs/governance-vote-result-evidence-status.json"),
  approvedCapabilities: [],
  disabledCapabilities,
  evidenceReference: recordFile.replace(root + "/", ""),
  publicStatusUpdate: "public-docs/public-status-update-status.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-governance-decision-action-approval-recording-result-v0.1",
  checkedAt: record.recordedAt,
  status: "GOVERNANCE_DECISION_ACTION_APPROVAL_RECORDED_NOT_DECISION",
  record: recordFile,
  config: configFile,
  governanceDecisionRecorded: false,
  fullLaunchApproved: false,
  approvedCapabilities: []
}, null, 2));
