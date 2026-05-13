import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const reportDir = path.join(root, "reports", "action-approvals", "governance-decision");
const reportFile = path.join(reportDir, "governance-decision-approval-status.json");

const publicJsonFile = path.join(root, "public-docs", "governance-decision-approval-status.json");
const publicHtmlFile = path.join(root, "public-docs", "governance-decision-approval.html");

fs.mkdirSync(reportDir, { recursive: true });

function readJson(relativePath, fallback = {}) {
  try {
    const full = path.join(root, relativePath);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[ch]));
}

function humanize(value) {
  return String(value || "UNKNOWN")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function check(checks, name, pass, details = {}) {
  checks.push({ name, pass: Boolean(pass), details });
}

const config = readJson("configs/action-approval-governance-decision.config.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const publicStatusUpdate = readJson("public-docs/public-status-update-status.json");
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

const baseRequiredBeforeActionApproval = config.requiredBeforeActionApproval || {};
const publicStatusUpdateFinalized =
  publicStatusUpdate.publicStatusUpdateFinalApproved === true &&
  publicStatusUpdate.doesNotApproveCapabilities === true &&
  publicStatusUpdate.fullLaunchApproved === false &&
  publicStatusUpdate.governanceDecisionRecorded === false;

const effectiveRequiredBeforeActionApproval = {
  ...baseRequiredBeforeActionApproval,
  capabilityMatrixFinalApproved:
    capabilityMatrix.capabilityMatrixFinalized === true &&
    capabilityMatrix.allCapabilitiesDisabled === true &&
    capabilityMatrix.allCapabilityApprovalsFalse === true
      ? true
      : baseRequiredBeforeActionApproval.capabilityMatrixFinalApproved,
  publicStatusUpdateFinalApproved: publicStatusUpdateFinalized
    ? true
    : baseRequiredBeforeActionApproval.publicStatusUpdateFinalApproved
};

const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);

const checks = [];

check(checks, "Selected action is governance decision recording", config.selectedAction?.id === "governance-decision-recording", {
  selectedAction: config.selectedAction?.id || "UNKNOWN"
});

check(checks, "Generic preparation complete", launchControl.genericPreparationComplete === true, {
  genericPreparationComplete: launchControl.genericPreparationComplete
});

check(checks, "Additional generic preparation stopped", launchControl.additionalGenericPreparationRecommended === false, {
  additionalGenericPreparationRecommended: launchControl.additionalGenericPreparationRecommended
});

check(checks, "Audit clearance recorded", config.operatorReportedClearances?.auditCleared === true, {
  auditCleared: config.operatorReportedClearances?.auditCleared
});

check(checks, "Legal clearance recorded", config.operatorReportedClearances?.legalCleared === true, {
  legalCleared: config.operatorReportedClearances?.legalCleared
});

check(checks, "Restricted launch stabilized", stabilization.status === "RESTRICTED_LAUNCH_STABILIZED", {
  status: stabilization.status || "UNKNOWN"
});

check(checks, "Mainnet monitor passing", monitor.status === "PASS", {
  status: monitor.status || "UNKNOWN"
});

check(checks, "Alerts do not require response", responseRequired === false, {
  responseRequired
});

check(checks, "No active incidents", activeIncidents === 0, {
  activeIncidents
});

check(checks, "Decision recording authorization not recorded", decisionAuthorization.decisionRecordingAuthorizationRecorded === false, {
  decisionRecordingAuthorizationRecorded: decisionAuthorization.decisionRecordingAuthorizationRecorded
});

check(checks, "Governance decision not recorded", decisionRecording.governanceDecisionRecorded === false, {
  governanceDecisionRecorded: decisionRecording.governanceDecisionRecorded
});

check(checks, "Governance resolution not signed", resolution.governanceResolutionSigned === false, {
  governanceResolutionSigned: resolution.governanceResolutionSigned
});

check(checks, "Resolution signing authorization not recorded", resolutionAuthorization.resolutionSigningAuthorizationRecorded === false, {
  resolutionSigningAuthorizationRecorded: resolutionAuthorization.resolutionSigningAuthorizationRecorded
});

check(checks, "Full launch not approved", fullLaunch.fullLaunchApproved === false && config.fullLaunchApproved === false, {
  publicFullLaunchApproved: fullLaunch.fullLaunchApproved,
  configFullLaunchApproved: config.fullLaunchApproved
});

check(checks, "Treasury funding not approved", treasuryFunding.treasuryFundingApproved === false, {
  treasuryFundingApproved: treasuryFunding.treasuryFundingApproved
});

check(checks, "Safe payload not generated", safeTx.safeTransactionPayloadGenerated === false, {
  safeTransactionPayloadGenerated: safeTx.safeTransactionPayloadGenerated
});

check(checks, "Mainnet execution queue disabled", execution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: execution.mode || "UNKNOWN"
});

const dryRunCases = [
  {
    id: "ACTION-GOV-DECISION-001",
    title: "Missing vote result blocks action approval",
    expected: "BLOCKED",
    actual: effectiveRequiredBeforeActionApproval?.voteResultRecorded === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "vote result is not recorded"
  },
  {
    id: "ACTION-GOV-DECISION-002",
    title: "Missing signed resolution blocks action approval",
    expected: "BLOCKED",
    actual: effectiveRequiredBeforeActionApproval?.signedGovernanceResolutionExists === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "signed governance resolution does not exist"
  },
  {
    id: "ACTION-GOV-DECISION-003",
    title: "Missing resolution authorization blocks action approval",
    expected: "BLOCKED",
    actual: effectiveRequiredBeforeActionApproval?.resolutionSigningAuthorizationRecorded === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "resolution signing authorization is not recorded"
  },
  {
    id: "ACTION-GOV-DECISION-004",
    title: "Capability matrix finalization status",
    expected: effectiveRequiredBeforeActionApproval?.capabilityMatrixFinalApproved === true ? "SATISFIED" : "BLOCKED",
    actual: effectiveRequiredBeforeActionApproval?.capabilityMatrixFinalApproved === true ? "SATISFIED" : "BLOCKED",
    reason: effectiveRequiredBeforeActionApproval?.capabilityMatrixFinalApproved === true
      ? "capability matrix is finalized as all-disabled"
      : "capability matrix is not final-approved"
  },
  {
    id: "ACTION-GOV-DECISION-005",
    title: "Public status update finalization status",
    expected: effectiveRequiredBeforeActionApproval?.publicStatusUpdateFinalApproved === true ? "SATISFIED" : "BLOCKED",
    actual: effectiveRequiredBeforeActionApproval?.publicStatusUpdateFinalApproved === true ? "SATISFIED" : "BLOCKED",
    reason: effectiveRequiredBeforeActionApproval?.publicStatusUpdateFinalApproved === true
      ? "public status update is finalized for restricted-mode / all-disabled posture"
      : "public status update is not final-approved"
  },
  {
    id: "ACTION-GOV-DECISION-006",
    title: "Action approval recording attempt",
    expected: "BLOCKED",
    actual: config.actionSpecificApprovalRecorded === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "this package must not record approval"
  },
  {
    id: "ACTION-GOV-DECISION-007",
    title: "Governance decision recording attempt",
    expected: "BLOCKED",
    actual: config.governanceDecisionRecorded === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "this package must not record a governance decision"
  },
  {
    id: "ACTION-GOV-DECISION-008",
    title: "Full launch approval attempt",
    expected: "BLOCKED",
    actual: config.fullLaunchApproved === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "this package must not approve full launch"
  },
  {
    id: "ACTION-GOV-DECISION-009",
    title: "Capability approval attempt",
    expected: "BLOCKED",
    actual: Object.values(config.capabilityApprovals || {}).every((value) => value === false) ? "BLOCKED" : "NOT_BLOCKED",
    reason: "this package must not approve any capability"
  }
].map((item) => ({
  ...item,
  pass: item.expected === item.actual
}));

for (const item of dryRunCases) {
  check(checks, `${item.id}: ${item.title}`, item.pass, {
    expected: item.expected,
    actual: item.actual,
    reason: item.reason
  });
}

const failures = checks.filter((item) => !item.pass);
const failedCases = dryRunCases.filter((item) => !item.pass);

const approvalStatus = {
  actionSpecificApprovalRequested: Boolean(config.actionSpecificApprovalRequested),
  actionSpecificApprovalRecorded: Boolean(config.actionSpecificApprovalRecorded),
  actionSpecificApprovalExecuted: Boolean(config.actionSpecificApprovalExecuted),
  governanceDecisionRecordingAuthorized: Boolean(config.governanceDecisionRecordingAuthorized),
  governanceDecisionRecorded: Boolean(config.governanceDecisionRecorded),
  governanceDecisionPublished: Boolean(config.governanceDecisionPublished),
  fullLaunchApproved: Boolean(config.fullLaunchApproved),
  treasuryFundingApproved: Boolean(config.treasuryFundingApproved),
  treasuryFundingTransactionAuthorized: Boolean(config.treasuryFundingTransactionAuthorized),
  treasuryFundingExecuted: Boolean(config.treasuryFundingExecuted),
  safeTransactionPayloadGenerated: Boolean(config.safeTransactionPayloadGenerated),
  safeTransactionPrepared: Boolean(config.safeTransactionPrepared),
  safeTransactionSubmitted: Boolean(config.safeTransactionSubmitted),
  safeTransactionSigned: Boolean(config.safeTransactionSigned),
  safeTransactionExecuted: Boolean(config.safeTransactionExecuted)
};

const actionBlockers = Object.entries(effectiveRequiredBeforeActionApproval || {})
  .filter(([key, value]) => value === false)
  .map(([key]) => key);

const status = failures.length === 0
  ? "ACTION_SPECIFIC_APPROVAL_PATH_READY_BLOCKED_PENDING_EVIDENCE"
  : "ACTION_SPECIFIC_APPROVAL_PATH_REVIEW_REQUIRED";

const report = {
  schema: "astra-action-specific-governance-decision-approval-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  selectedAction: config.selectedAction,
  currentApprovedMode: "restricted-mainnet-operation",
  actionSpecificApprovalRecorded: false,
  governanceDecisionRecorded: false,
  fullLaunchApproved: false,
  publicStatement:
    "AstraTreasury has selected governance decision recording as the first action-specific approval path. The path is ready, but approval remains blocked until vote/result, signed resolution, capability matrix, evidence, and final approval requirements are complete.",
  summary: {
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    dryRunCases: dryRunCases.length,
    dryRunCasesPassed: dryRunCases.filter((item) => item.pass).length,
    failedCases: failedCases.length,
    activeIncidents,
    responseRequired,
    blockerCount: actionBlockers.length
  },
  clearances: config.operatorReportedClearances,
  approvalStatus,
  requiredBeforeActionApproval: effectiveRequiredBeforeActionApproval,
  actionBlockers,
  approvalChecklist: config.approvalChecklist,
  draftApprovalRecord: config.draftApprovalRecord,
  capabilityApprovals: config.capabilityApprovals,
  dryRunCases,
  currentStatuses: {
    launchControl: launchControl.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
    publicStatusUpdate: publicStatusUpdate.status || "UNKNOWN",
    stabilization: stabilization.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    decisionRecording: decisionRecording.status || "UNKNOWN",
    decisionAuthorization: decisionAuthorization.status || "UNKNOWN",
    governanceResolution: resolution.status || "UNKNOWN",
    resolutionAuthorization: resolutionAuthorization.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    treasurySafeTransaction: safeTx.status || "UNKNOWN",
    monitor: monitor.status || "UNKNOWN",
    alerts: alerts.status || "UNKNOWN",
    incidents: incidents.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
  checks,
  failures,
  restrictions: {
    publicTokenSale: false,
    realTreasuryFunding: false,
    stakingOrRewards: false,
    buybackProgram: false,
    autonomousExecution: false,
    mainnetExecutionQueue: false,
    paperToOnchainAutomation: false
  },
  nextPossibleMilestones: [
    "Capability matrix finalization",
    "Public status update finalization",
    "Governance vote/result evidence import",
    "Signed resolution evidence import",
    "Governance decision recording live package"
  ],
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

writeJson(reportFile, report);
writeJson(publicJsonFile, report);

const approvalRows = Object.entries(approvalStatus).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete / true" : "Pending / false"}</td></tr>`;
}).join("");

const blockerRows = actionBlockers.length === 0
  ? '<tr><td colspan="2">No blockers.</td></tr>'
  : actionBlockers.map((item) => `<tr><td>${escapeHtml(item)}</td><td>Required before approval</td></tr>`).join("");

const caseRows = dryRunCases.map((item) => {
  return `<tr><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.actual)}</td><td>${item.pass ? "PASS" : "FAIL"}</td></tr>`;
}).join("");

const checklistRows = Object.entries(config.approvalChecklist || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete" : "Pending"}</td></tr>`;
}).join("");

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Governance Decision Approval</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #08111f;
      --surface: #0e1a2b;
      --border: rgba(148, 163, 184, 0.2);
      --text: #edf4fb;
      --muted: #9aaec4;
      --blue: #67a7ff;
      --green: #41d49b;
      --yellow: #f4c35f;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    body { margin: 0; background: linear-gradient(180deg, #07101d, var(--bg)); color: var(--text); }
    a { color: var(--blue); text-decoration: none; }

    main {
      width: min(1120px, calc(100% - 40px));
      margin: 0 auto;
      padding: 44px 0 72px;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 28px;
      box-shadow: 0 22px 70px rgba(0,0,0,.28);
      margin-bottom: 18px;
    }

    h1 { margin: 0 0 10px; font-size: 42px; letter-spacing: -1.2px; }
    h2 { margin: 0 0 14px; font-size: 24px; }
    p { color: var(--muted); line-height: 1.65; }

    .badge {
      display: inline-flex;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(244,195,95,.08);
      border: 1px solid rgba(244,195,95,.22);
      color: var(--yellow);
      font-weight: 850;
      margin-bottom: 16px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--border);
      border-radius: 18px;
      overflow: hidden;
    }

    th, td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
    }

    th {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .08em;
      background: rgba(255,255,255,.03);
    }

    tr:last-child td { border-bottom: 0; }

    .notice {
      padding: 16px;
      border-radius: 16px;
      background: rgba(244,195,95,.08);
      border: 1px solid rgba(244,195,95,.22);
      color: #f7d99a;
      line-height: 1.6;
    }
  </style>
</head>
<body>
<main>
  <section class="card">
    <div class="badge">Action-specific path · approval not recorded</div>
    <h1>Governance Decision Approval</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Action approval status</h2>
    <table>
      <thead><tr><th>Item</th><th>Status</th></tr></thead>
      <tbody>${approvalRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Current blockers</h2>
    <table>
      <thead><tr><th>Blocker</th><th>Meaning</th></tr></thead>
      <tbody>${blockerRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Dry-run cases</h2>
    <table>
      <thead><tr><th>ID</th><th>Case</th><th>Outcome</th><th>Status</th></tr></thead>
      <tbody>${caseRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Approval checklist</h2>
    <table>
      <thead><tr><th>Item</th><th>Status</th></tr></thead>
      <tbody>${checklistRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table>
      <thead><tr><th>Area</th><th>Status</th></tr></thead>
      <tbody>${statusRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This is the first action-specific approval path. It does not record approval or a governance decision.
      Full launch and all restricted capabilities remain not approved.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/governance-decision-approval">/api/public/governance-decision-approval</a></p>
    <p><a href="/launch-control">Launch Control</a></p>
    <p><a href="/full-launch-governance-decision-recording">Governance decision recording</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Governance Decision Approval");
console.log("==========================================");
console.log(`Status: ${report.status}`);
console.log(`Checks passed: ${report.summary.passed}/${report.summary.totalChecks}`);
console.log(`Dry-run cases passed: ${report.summary.dryRunCasesPassed}/${report.summary.dryRunCases}`);
console.log(`Blockers: ${report.summary.blockerCount}`);
console.log(`Report: ${reportFile}`);
