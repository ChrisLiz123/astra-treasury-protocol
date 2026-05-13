import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const evidenceRelativePath = "reports/governance-vote-result-evidence/import/governance-vote-result-evidence.json";
const evidencePath = path.join(root, evidenceRelativePath);

const requiredFiles = [
  "configs/governance-vote-result-evidence-import.config.json",
  "docs/action-approvals/governance-vote-result-evidence/GOVERNANCE_VOTE_RESULT_EVIDENCE_IMPORT.md",
  "docs/action-approvals/governance-vote-result-evidence/VOTE_RESULT_EVIDENCE_TEMPLATE.json",
  "docs/action-approvals/governance-vote-result-evidence/VOTE_RESULT_EVIDENCE_IMPORT_CHECKLIST.md",
  "docs/action-approvals/governance-vote-result-evidence/VOTE_RESULT_EVIDENCE_BLOCKERS.md",
  "public-docs/launch-control-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/public-status-update-status.json",
  "public-docs/stabilization-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/full-launch-governance-vote-status.json",
  "public-docs/full-launch-governance-decision-recording-status.json",
  "public-docs/treasury-funding-status.json",
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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required vote/result evidence file.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/governance-vote-result-evidence-import.config.json");
  const launchControl = readJson("public-docs/launch-control-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const publicStatusUpdate = readJson("public-docs/public-status-update-status.json");
  const stabilization = readJson("public-docs/stabilization-status.json");
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

  if (config.evidenceImportFrameworkPrepared !== true) {
    issue("evidenceImportFrameworkPrepared", "Evidence import framework should be prepared.");
  }

  if (config.governanceDecisionRecorded !== false) {
    issue("governanceDecisionRecorded", "Governance decision must remain not recorded.");
  }

  if (config.fullLaunchApproved !== false) {
    issue("fullLaunchApproved", "Full launch must remain not approved.");
  }

  for (const [key, value] of Object.entries(config.capabilityApprovals || {})) {
    if (value !== false) {
      issue(`capabilityApprovals.${key}`, "Capability approval must remain false.");
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

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (decisionRecording.governanceDecisionRecorded !== false) {
    issue("decisionRecording.governanceDecisionRecorded", "Governance decision must remain not recorded.");
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

  if (fs.existsSync(evidencePath)) {
    let evidence;

    try {
      evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
    } catch (error) {
      issue(evidenceRelativePath, `Evidence file is not valid JSON: ${error.message}`);
    }

    if (evidence) {
      if (evidence.schema !== "astra-governance-vote-result-evidence-v0.1") {
        issue("evidence.schema", "Evidence schema must be astra-governance-vote-result-evidence-v0.1.");
      }

      for (const key of [
        "voteTitle",
        "voteUrl",
        "voteMechanism",
        "openedAt",
        "closedAt",
        "result",
        "evidenceReference",
        "capabilityMatrixReference",
        "publicStatusReference"
      ]) {
        if (!isNonEmptyString(evidence[key])) {
          issue(`evidence.${key}`, "Required evidence field is missing or empty.");
        }
      }

      if (evidence.voteOpened !== true) {
        issue("evidence.voteOpened", "voteOpened must be true.");
      }

      if (evidence.voteCompleted !== true) {
        issue("evidence.voteCompleted", "voteCompleted must be true.");
      }

      if (evidence.voteResultRecorded !== true) {
        issue("evidence.voteResultRecorded", "voteResultRecorded must be true.");
      }

      if (!Array.isArray(evidence.approvedCapabilities)) {
        issue("evidence.approvedCapabilities", "approvedCapabilities must be an array.");
      }

      const evidenceText = JSON.stringify(evidence).toLowerCase();
      for (const forbidden of ["private key", "seed phrase", "password", "secret", "mnemonic"]) {
        if (evidenceText.includes(forbidden)) {
          issue(evidenceRelativePath, `Evidence appears to contain forbidden sensitive phrase: ${forbidden}`);
        }
      }
    }
  }
}

const result = {
  schema: "astra-governance-vote-result-evidence-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  evidenceFile: evidenceRelativePath,
  evidenceFilePresent: fs.existsSync(evidencePath),
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
