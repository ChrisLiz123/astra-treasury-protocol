import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "full-launch-governance-vote-opening-execution.config.json");

const requiredFiles = [
  "docs/full-launch-governance-vote-opening-execution/GOVERNANCE_VOTE_OPENING_EXECUTION_PACKAGE.md",
  "docs/full-launch-governance-vote-opening-execution/GOVERNANCE_VOTE_OPENING_RUNBOOK.md",
  "docs/full-launch-governance-vote-opening-execution/GOVERNANCE_VOTE_OPENING_PUBLIC_NOTICE_EXECUTION_TEMPLATE.md",
  "docs/full-launch-governance-vote-opening-execution/GOVERNANCE_VOTE_OPENING_EVIDENCE_CAPTURE.md",
  "docs/full-launch-governance-vote-opening-execution/GOVERNANCE_VOTE_OPENING_DRY_RUN_CASES.md",
  "docs/full-launch-governance-vote-opening-execution/GOVERNANCE_VOTE_OPENING_EXECUTION_DECISION_RECORD.md",
  "docs/full-launch-governance-vote-opening-execution/GOVERNANCE_VOTE_OPENING_EXECUTION_BLOCKERS.md",
  "public-docs/stabilization-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/full-launch-governance-status.json",
  "public-docs/full-launch-governance-vote-status.json",
  "public-docs/full-launch-governance-vote-opening-status.json",
  "public-docs/full-launch-governance-vote-authorization-status.json",
  "public-docs/treasury-safe-transaction-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-alerts-status.json",
  "public-docs/incident-summary.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenVoteFiles = [
  "reports/full-launch-governance-vote/vote-opened.json",
  "reports/full-launch-governance-vote/vote-result.json",
  "public-docs/full-launch-governance-vote-live.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

if (!fs.existsSync(configPath)) {
  issue("configs/full-launch-governance-vote-opening-execution.config.json", "Missing governance vote opening execution config.");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required governance vote opening execution file.");
  }
}

for (const file of forbiddenVoteFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden vote-open/result file exists. This milestone must not open a vote.");
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

  if (config.voteOpeningExecutionPackagePrepared !== true) {
    issue("voteOpeningExecutionPackagePrepared", "Vote opening execution package should be prepared.");
  }

  if (config.voteOpeningExecutionDryRunOnly !== true) {
    issue("voteOpeningExecutionDryRunOnly", "Vote opening execution must remain dry-run only.");
  }

  const mustRemainFalse = [
    "governanceVoteAuthorizationRecorded",
    "governanceVoteOpeningAuthorized",
    "governanceVoteOpened",
    "governanceVoteCompleted",
    "governanceResolutionSigned",
    "governanceDecisionRecorded",
    "governanceFullLaunchApprovalRecorded",
    "fullLaunchApproved",
    "publicVoteNoticePublished",
    "voteUrlCreated",
    "voteEvidenceSnapshotCaptured",
    "preVotePublicStatusPublished",
    "postVoteOpeningStatusPublished",
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
      issue(key, "Vote opening execution item must remain false.");
    }
  }

  const plan = config.openingExecutionPlan || {};
  if (plan.voteUrl !== "not created") {
    issue("openingExecutionPlan.voteUrl", "Vote URL must remain not created.");
  }

  if (plan.publicNoticeUrl !== "not published") {
    issue("openingExecutionPlan.publicNoticeUrl", "Public notice URL must remain not published.");
  }

  for (const [key, value] of Object.entries(config.capabilityApprovals || {})) {
    if (value !== false) {
      issue(`capabilityApprovals.${key}`, "Capability approval must remain false.");
    }
  }

  for (const [key, value] of Object.entries(config.requiredBeforeActualVoteOpening || {})) {
    if ([
      "restrictedLaunchStabilized",
      "auditClearanceRecorded",
      "legalClearanceRecorded",
      "governanceVoteAuthorizationPackageReady",
      "governanceVoteOpeningPackageReady",
      "governanceVotePackageReady",
      "mainnetMonitorPassing",
      "activeIncidentsZero"
    ].includes(key)) {
      if (value !== true) {
        issue(`requiredBeforeActualVoteOpening.${key}`, "Preparation prerequisite should be true.");
      }
    } else if (value !== false) {
      issue(`requiredBeforeActualVoteOpening.${key}`, "Actual vote-opening prerequisite must remain false until completed.");
    }
  }

  for (const [key, value] of Object.entries(config.openingExecutionChecklist || {})) {
    if (value !== false) {
      issue(`openingExecutionChecklist.${key}`, "Opening checklist item must remain false until actual review.");
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

const authPath = path.join(root, "public-docs", "full-launch-governance-vote-authorization-status.json");
if (fs.existsSync(authPath)) {
  const auth = JSON.parse(fs.readFileSync(authPath, "utf8"));
  if (auth.governanceVoteAuthorizationRecorded !== false) {
    issue("voteAuthorization.governanceVoteAuthorizationRecorded", "Vote authorization must remain not recorded.");
  }
  if (auth.governanceVoteOpeningAuthorized !== false) {
    issue("voteAuthorization.governanceVoteOpeningAuthorized", "Vote opening must remain not authorized.");
  }
}

const openingPath = path.join(root, "public-docs", "full-launch-governance-vote-opening-status.json");
if (fs.existsSync(openingPath)) {
  const opening = JSON.parse(fs.readFileSync(openingPath, "utf8"));
  if (opening.governanceVoteOpeningAuthorized !== false) {
    issue("voteOpening.governanceVoteOpeningAuthorized", "Vote opening must remain not authorized.");
  }
  if (opening.governanceVoteOpened !== false) {
    issue("voteOpening.governanceVoteOpened", "Vote must remain not opened.");
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
  schema: "astra-full-launch-governance-vote-opening-execution-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
