import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "configs/launch-control.config.json",
  "docs/launch-control/LAUNCH_CONTROL_MATRIX.md",
  "docs/launch-control/LAUNCH_CONTROL_DECISION_GUIDE.md",
  "public-docs/stabilization-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-execution-status.json",
  "public-docs/incident-summary.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/treasury-safe-transaction-status.json"
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
    issue(file, "Missing required launch-control file.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/launch-control.config.json");
  const stabilization = readJson("public-docs/stabilization-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const monitor = readJson("public-docs/mainnet-monitor-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");
  const incidents = readJson("public-docs/incident-summary.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const safeTx = readJson("public-docs/treasury-safe-transaction-status.json");

  if (config.operatorReportedClearances?.auditCleared !== true) {
    issue("operatorReportedClearances.auditCleared", "Audit clearance should be recorded.");
  }

  if (config.operatorReportedClearances?.legalCleared !== true) {
    issue("operatorReportedClearances.legalCleared", "Legal clearance should be recorded.");
  }

  if (config.additionalGenericPreparationRecommended !== false) {
    issue("additionalGenericPreparationRecommended", "Generic preparation should now be marked unnecessary.");
  }

  if (stabilization.status !== "RESTRICTED_LAUNCH_STABILIZED") {
    issue("stabilization.status", `Expected RESTRICTED_LAUNCH_STABILIZED, got ${stabilization.status}`);
  }

  if (monitor.status !== "PASS") {
    issue("mainnetMonitor.status", `Expected PASS, got ${monitor.status}`);
  }

  if (Number(incidents?.summary?.active || 0) !== 0) {
    issue("incidents.summary.active", "Active incidents must be zero.");
  }

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("mainnetExecution.mode", "Mainnet execution queue must remain disabled.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunchApproved", "Full launch must remain not approved.");
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

  for (const [key, value] of Object.entries(config.capabilities || {})) {
    if (value !== false) {
      issue(`capabilities.${key}`, "Capability must remain false unless separately approved.");
    }
  }
}

const result = {
  schema: "astra-launch-control-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
