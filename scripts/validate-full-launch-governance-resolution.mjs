import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "full-launch-governance-resolution.config.json");

const requiredFiles = [
  "docs/full-launch-governance-resolution/GOVERNANCE_RESOLUTION_SIGNING_PACKAGE.md",
  "docs/full-launch-governance-resolution/GOVERNANCE_RESOLUTION_SIGNING_CHECKLIST.md",
  "docs/full-launch-governance-resolution/GOVERNANCE_RESOLUTION_TEMPLATE.md",
  "docs/full-launch-governance-resolution/GOVERNANCE_RESOLUTION_EVIDENCE_PLAN.md",
  "docs/full-launch-governance-resolution/GOVERNANCE_RESOLUTION_DECISION_RECORD.md",
  "docs/full-launch-governance-resolution/GOVERNANCE_RESOLUTION_BLOCKERS.md",
  "docs/full-launch-governance-resolution/GOVERNANCE_RESOLUTION_PUBLIC_STATUS_TEMPLATE.md",
  "public-docs/stabilization-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/full-launch-governance-status.json",
  "public-docs/full-launch-governance-vote-status.json",
  "public-docs/full-launch-governance-vote-opening-status.json",
  "public-docs/full-launch-governance-vote-authorization-status.json",
  "public-docs/full-launch-governance-vote-opening-execution-status.json",
  "public-docs/treasury-safe-transaction-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-alerts-status.json",
  "public-docs/incident-summary.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenResolutionFiles = [
  "reports/full-launch-governance-resolution/signed-resolution.json",
  "reports/full-launch-governance-resolution/governance-decision.json",
  "public-docs/full-launch-governance-resolution-signed.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

if (!fs.existsSync(configPath)) {
  issue("configs/full-launch-governance-resolution.config.json", "Missing governance resolution config.");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required governance resolution file.");
  }
}

for (const file of forbiddenResolutionFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden signed-resolution/decision file exists. This milestone must not sign a resolution.");
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

  if (config.governanceResolutionPackagePrepared !== true) {
    issue("governanceResolutionPackagePrepared", "Governance resolution package should be prepared.");
  }

  if (config.draftResolutionPrepared !== true) {
    issue("draftResolutionPrepared", "Draft resolution should be prepared.");
  }

  if (config.signingEvidencePlanPrepared !== true) {
    issue("signingEvidencePlanPrepared", "Signing evidence plan should be prepared.");
  }

  const mustRemainFalse = [
    "resolutionSigningAuthorized",
    "governanceResolutionPrepared",
    "governanceResolutionSigned",
    "governanceResolutionPublished",
    "governanceDecisionRecorded",
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
      issue(key, "Resolution-signing item must remain false.");
    }
  }

  for (const [key, value] of Object.entries(config.capabilityApprovals || {})) {
    if (value !== false) {
      issue(`capabilityApprovals.${key}`, "Capability approval must remain false.");
    }
  }

  const draft = config.draftResolution || {};
  if (draft.status !== "draft only - not signed") {
    issue("draftResolution.status", "Resolution must remain draft only.");
  }

  if (draft.decision !== "NOT APPROVED") {
    issue("draftResolution.decision", "Draft resolution decision must remain NOT APPROVED.");
  }

  if (Array.isArray(draft.approvedCapabilities) && draft.approvedCapabilities.length !== 0) {
    issue("draftResolution.approvedCapabilities", "Approved capabilities must remain empty.");
  }

  if (draft.resolutionHash) {
    issue("draftResolution.resolutionHash", "Resolution hash must remain empty.");
  }

  if (draft.signedAt) {
    issue("draftResolution.signedAt", "Signed timestamp must remain empty.");
  }

  for (const [key, value] of Object.entries(config.requiredBeforeResolutionSigning || {})) {
    if ([
      "restrictedLaunchStabilized",
      "auditClearanceRecorded",
      "legalClearanceRecorded",
      "governanceVotePackageReady",
      "governanceVoteOpeningPackageReady",
      "governanceVoteAuthorizationPackageReady",
      "governanceVoteOpeningExecutionPackageReady",
      "mainnetMonitorPassing",
      "activeIncidentsZero"
    ].includes(key)) {
      if (value !== true) {
        issue(`requiredBeforeResolutionSigning.${key}`, "Preparation prerequisite should be true.");
      }
    } else if (value !== false) {
      issue(`requiredBeforeResolutionSigning.${key}`, "Resolution-signing prerequisite must remain false until completed.");
    }
  }

  for (const [key, value] of Object.entries(config.resolutionSigningChecklist || {})) {
    if (value !== false) {
      issue(`resolutionSigningChecklist.${key}`, "Resolution signing checklist item must remain false until actual review.");
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

const voteExecutionPath = path.join(root, "public-docs", "full-launch-governance-vote-opening-execution-status.json");
if (fs.existsSync(voteExecutionPath)) {
  const voteExec = JSON.parse(fs.readFileSync(voteExecutionPath, "utf8"));
  if (voteExec.governanceVoteOpened !== false) {
    issue("voteOpeningExecution.governanceVoteOpened", "Vote must remain not opened.");
  }
  if (voteExec.governanceDecisionRecorded !== false) {
    issue("voteOpeningExecution.governanceDecisionRecorded", "Governance decision must remain not recorded.");
  }
}

const voteAuthPath = path.join(root, "public-docs", "full-launch-governance-vote-authorization-status.json");
if (fs.existsSync(voteAuthPath)) {
  const voteAuth = JSON.parse(fs.readFileSync(voteAuthPath, "utf8"));
  if (voteAuth.governanceVoteAuthorizationRecorded !== false) {
    issue("voteAuthorization.governanceVoteAuthorizationRecorded", "Vote authorization must remain not recorded.");
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
  schema: "astra-full-launch-governance-resolution-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
