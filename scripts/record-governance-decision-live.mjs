import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const confirmation = process.env.GOVERNANCE_DECISION_RECORDING_CONFIRM || "";
const decisionRecorder = process.env.DECISION_RECORDER || "";
const decisionIdInput = process.env.GOVERNANCE_DECISION_ID || "";

const requiredConfirmation = "RECORD_RESTRICTED_MODE_ALL_DISABLED_DECISION";

const recordDir = path.join(root, "reports", "full-launch-governance-decision", "live");
const recordFile = path.join(recordDir, "governance-decision-record.json");
const configFile = path.join(root, "configs", "governance-decision-live-recording.config.json");

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
    normalized.includes("replace_with") ||
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
    "GOVERNANCE_DECISION_RECORDING_CONFIRM",
    `Must equal ${requiredConfirmation}. This prevents accidental governance decision recording.`
  );
}

if (isPlaceholder(decisionRecorder)) {
  issue("DECISION_RECORDER", "Set DECISION_RECORDER to the real decision recorder name or governance reference.");
}

const livePrecheck = readJson("public-docs/governance-decision-live-precheck-status.json");
const actionApproval = readJson("public-docs/governance-decision-approval-status.json");
const signedResolutionEvidence = readJson("public-docs/signed-governance-resolution-evidence-status.json");
const launchControl = readJson("public-docs/launch-control-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const publicStatusUpdate = readJson("public-docs/public-status-update-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const safeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireTrue(
  "livePrecheck.status",
  livePrecheck.status === "GOVERNANCE_DECISION_RECORDING_LIVE_PRECHECK_READY_TO_RECORD" &&
    livePrecheck.readyToRecordGovernanceDecision === true,
  "Live precheck must be READY_TO_RECORD."
);

requireTrue(
  "actionApproval.actionSpecificApprovalRecorded",
  actionApproval.actionSpecificApprovalRecorded === true,
  "Action-specific approval must be recorded."
);

requireTrue(
  "signedResolutionEvidence",
  signedResolutionEvidence.signedResolutionEvidenceImported === true &&
    signedResolutionEvidence.signedResolutionValidated === true &&
    signedResolutionEvidence.signedGovernanceResolutionExists === true &&
    signedResolutionEvidence.resolutionSigningAuthorizationRecorded === true,
  "Signed resolution evidence must be imported and validated."
);

requireTrue(
  "launchControl.status",
  launchControl.status === "LAUNCH_CONTROL_READY_RESTRICTED_MODE",
  "Launch Control must be ready in restricted mode."
);

requireTrue(
  "capabilityMatrix",
  capabilityMatrix.capabilityMatrixFinalized === true &&
    capabilityMatrix.allCapabilitiesDisabled === true &&
    capabilityMatrix.allCapabilityApprovalsFalse === true,
  "Capability Matrix must be finalized as all-disabled."
);

requireTrue(
  "publicStatusUpdate",
  publicStatusUpdate.publicStatusUpdateFinalApproved === true &&
    publicStatusUpdate.doesNotApproveCapabilities === true &&
    publicStatusUpdate.fullLaunchApproved === false &&
    publicStatusUpdate.governanceDecisionRecorded === false,
  "Public Status Update must be finalized for restricted-mode / all-disabled posture."
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
  "Full launch must remain not approved by this decision."
);

requireTrue(
  "treasuryFunding.treasuryFundingApproved",
  treasuryFunding.treasuryFundingApproved === false,
  "Treasury funding must remain not approved by this decision."
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

if (fs.existsSync(recordFile)) {
  issue("governance-decision-record.json", "Governance decision record already exists. Refusing to overwrite.");
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-governance-decision-live-recording-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_GOVERNANCE_DECISION_NOT_RECORDED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const now = new Date().toISOString();
const compactDate = now.slice(0, 10).replaceAll("-", "");
const decisionId = isPlaceholder(decisionIdInput)
  ? `ASTRA-GOV-DEC-${compactDate}-001`
  : decisionIdInput.trim();

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
  schema: "astra-governance-decision-record-v0.1",
  decisionId,
  recordedAt: now,
  status: "GOVERNANCE_DECISION_RECORDED_RESTRICTED_MODE_ALL_DISABLED",
  currentApprovedMode: "restricted-mainnet-operation",
  decisionRecorder,
  decisionScope: "restricted-mode-all-disabled",
  governanceProcessMode: "resolution-only",
  resolutionReference: signedResolutionEvidence.evidenceSummary?.resolutionReference || "",
  resolutionHash: signedResolutionEvidence.evidenceSummary?.resolutionHash || "",
  resolutionSignedAt: signedResolutionEvidence.evidenceSummary?.signedAt || "",
  governanceProcessReference: signedResolutionEvidence.evidenceSummary?.governanceProcessReference || "",
  actionApprovalReference: "reports/action-approvals/governance-decision/action-approval-record.json",
  capabilityMatrixReference: "public-docs/capability-matrix-status.json",
  publicStatusUpdateReference: "public-docs/public-status-update-status.json",
  approvedCapabilities: [],
  disabledCapabilities,
  governanceDecisionRecorded: true,
  fullLaunchApproved: false,
  publicDisclosuresFinalApproved: false,
  treasuryDisclosureFinalApproved: false,
  treasuryFundingApproved: false,
  treasuryFundingTransactionAuthorized: false,
  treasuryFundingExecuted: false,
  safeTransactionPayloadGenerated: false,
  safeTransactionPrepared: false,
  safeTransactionSubmitted: false,
  safeTransactionSigned: false,
  safeTransactionExecuted: false,
  mainnetExecutionQueueEnabled: false,
  safety: {
    sendsTransactions: false,
    movesFunds: false,
    deploysContracts: false,
    enablesExecution: false,
    approvesPublicSale: false,
    approvesTreasuryFunding: false,
    preparesSafeTransaction: false,
    approvesFullLaunch: false
  }
};

writeJson(recordFile, record);

const config = readJsonFull(configFile);

config.status = "governance-decision-recorded-restricted-mode-all-disabled";
config.governanceDecisionRecorded = true;
config.governanceDecisionPublished = true;
config.fullLaunchApproved = false;
config.treasuryFundingApproved = false;
config.treasuryFundingTransactionAuthorized = false;
config.treasuryFundingExecuted = false;
config.safeTransactionPayloadGenerated = false;
config.safeTransactionPrepared = false;
config.safeTransactionSubmitted = false;
config.safeTransactionSigned = false;
config.safeTransactionExecuted = false;
config.approvedCapabilities = [];
config.disabledCapabilities = disabledCapabilities;
config.recordedDecision = {
  decisionId,
  recordedAt: now,
  recordFile: recordFile.replace(root + "/", ""),
  decisionScope: "restricted-mode-all-disabled"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-governance-decision-live-recording-result-v0.1",
  checkedAt: now,
  status: "GOVERNANCE_DECISION_RECORDED_RESTRICTED_MODE_ALL_DISABLED",
  record: recordFile,
  governanceDecisionRecorded: true,
  fullLaunchApproved: false,
  approvedCapabilities: []
}, null, 2));
