import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const selectionRelativePath = "reports/dex-liquidity-parameter-selection/import/dex-liquidity-parameter-selection.json";
const selectionPath = path.join(root, selectionRelativePath);

const reportDir = path.join(root, "reports", "dex-liquidity-parameter-selection");
const reportFile = path.join(reportDir, "dex-liquidity-parameter-selection-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-liquidity-parameter-selection-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-liquidity-parameter-selection.html");

fs.mkdirSync(reportDir, { recursive: true });

const artifactPaths = [
  "configs/dex-liquidity-parameter-selection-import.config.json",
  "docs/dex-liquidity-parameter-selection/DEX_LIQUIDITY_PARAMETER_SELECTION_IMPORT.md",
  "docs/dex-liquidity-parameter-selection/DEX_PARAMETER_SELECTION_FIELDS.md",
  "docs/dex-liquidity-parameter-selection/DEX_PARAMETER_SELECTION_IMPORT_RUNBOOK.md",
  "docs/dex-liquidity-parameter-selection/DEX_PARAMETER_SELECTION_BOUNDARIES.md",
  "docs/dex-liquidity-parameter-selection/DEX_PARAMETER_SELECTION_TEMPLATE.json",
  "scripts/import-dex-liquidity-parameter-selection.mjs",
  "public-docs/dex-liquidity-parameters-status.json",
  "public-docs/dex-liquidity-path-status.json",
  "public-docs/restricted-mode-final-release-status.json",
  "public-docs/governance-decision-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/treasury-safe-transaction-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-alerts-status.json",
  "public-docs/incident-summary.json",
  "public-docs/mainnet-execution-status.json"
];

function readJson(relativePath, fallback = {}) {
  try {
    const full = path.join(root, relativePath);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sha256File(relativePath) {
  const full = path.join(root, relativePath);
  const buffer = fs.readFileSync(full);

  return {
    path: relativePath,
    bytes: buffer.length,
    sha256: sha256Buffer(buffer)
  };
}

function sha256Json(value) {
  return sha256Buffer(Buffer.from(JSON.stringify(value, null, 2) + "\n"));
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
    normalized === "yyyy-mm-ddthh:mm:ssz"
  );
}

function looksSensitive(value) {
  const normalized = String(value || "").toLowerCase();

  return (
    normalized.includes("private key") ||
    normalized.includes("seed phrase") ||
    normalized.includes("mnemonic") ||
    normalized.includes("password") ||
    normalized.includes("secret")
  );
}

function usableString(value) {
  return typeof value === "string" && !isPlaceholder(value) && !looksSensitive(value);
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

const config = readJson("configs/dex-liquidity-parameter-selection-import.config.json");
const parameterReview = readJson("public-docs/dex-liquidity-parameters-status.json");
const dexPath = readJson("public-docs/dex-liquidity-path-status.json");
const finalRelease = readJson("public-docs/restricted-mode-final-release-status.json");
const governanceDecision = readJson("public-docs/governance-decision-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const treasurySafeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);

const checks = [];

check(checks, "Selection import prepared", config.selectionImportPrepared === true, {
  selectionImportPrepared: config.selectionImportPrepared
});

check(checks, "Selection import only", config.selectionImportOnly === true, {
  selectionImportOnly: config.selectionImportOnly
});

for (const key of [
  "parametersSelected",
  "parametersFinalized",
  "dexLiquidityPathApproved",
  "liquidityPoolCreationApproved",
  "liquidityProvisionApproved",
  "publicTradingApproved",
  "publicTradingLinkApproved",
  "buyPageActivationApproved",
  "safePayloadGenerationApproved",
  "safeTransactionExecutionApproved",
  "treasuryFundingApproved",
  "fullLaunchApproved"
]) {
  check(checks, `${key} remains false`, config[key] === false, { value: config[key] });
}

check(checks, "Parameter review ready", parameterReview.status === "DEX_LIQUIDITY_PARAMETER_REVIEW_READY_NOT_FINALIZED", {
  status: parameterReview.status || "UNKNOWN"
});

check(checks, "DEX path selected not approved", dexPath.status === "DEX_LIQUIDITY_PATH_SELECTED_NOT_APPROVED", {
  status: dexPath.status || "UNKNOWN"
});

check(checks, "Restricted-mode final release ready", finalRelease.status === "RESTRICTED_MODE_FINAL_RELEASE_READY_DECISION_RECORDED_ALL_DISABLED", {
  status: finalRelease.status || "UNKNOWN"
});

check(checks, "Governance decision recorded", governanceDecision.governanceDecisionRecorded === true && governanceDecision.fullLaunchApproved === false, {
  governanceDecisionRecorded: governanceDecision.governanceDecisionRecorded,
  fullLaunchApproved: governanceDecision.fullLaunchApproved
});

check(checks, "Capability Matrix all-disabled", capabilityMatrix.allCapabilitiesDisabled === true && capabilityMatrix.allCapabilityApprovalsFalse === true, {
  allCapabilitiesDisabled: capabilityMatrix.allCapabilitiesDisabled,
  allCapabilityApprovalsFalse: capabilityMatrix.allCapabilityApprovalsFalse
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

check(checks, "Execution queue disabled", execution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: execution.mode || "UNKNOWN"
});

check(checks, "Full launch not approved", fullLaunch.fullLaunchApproved === false, {
  fullLaunchApproved: fullLaunch.fullLaunchApproved
});

check(checks, "Treasury funding not approved", treasuryFunding.treasuryFundingApproved === false, {
  treasuryFundingApproved: treasuryFunding.treasuryFundingApproved
});

check(checks, "Treasury funding not executed", treasuryFunding.treasuryFundingExecuted === false, {
  treasuryFundingExecuted: treasuryFunding.treasuryFundingExecuted
});

check(checks, "Safe payload not generated", treasurySafeTx.safeTransactionPayloadGenerated === false, {
  safeTransactionPayloadGenerated: treasurySafeTx.safeTransactionPayloadGenerated
});

check(checks, "Safe transaction not prepared", treasurySafeTx.safeTransactionPrepared === false, {
  safeTransactionPrepared: treasurySafeTx.safeTransactionPrepared
});

let selection = null;
let selectionValid = false;
let selectionParseError = "";
const selectionIssues = [];

if (fs.existsSync(selectionPath)) {
  try {
    selection = JSON.parse(fs.readFileSync(selectionPath, "utf8"));
  } catch (error) {
    selectionParseError = error.message;
    selectionIssues.push(`Selection file is not valid JSON: ${error.message}`);
  }

  if (selection) {
    if (selection.schema !== "astra-dex-liquidity-parameter-selection-v0.1") {
      selectionIssues.push("Invalid selection schema.");
    }

    for (const key of config.requiredSelectionFields || []) {
      if (!usableString(selection[key])) {
        selectionIssues.push(`Missing, placeholder, or sensitive field: ${key}`);
      }
    }

    if (!Array.isArray(config.allowedPairs) || !config.allowedPairs.includes(selection.tokenPair)) {
      selectionIssues.push("Selected token pair is not allowed.");
    }

    if (!Array.isArray(config.allowedPoolVersions) || !config.allowedPoolVersions.includes(selection.poolVersion)) {
      selectionIssues.push("Selected pool version is not allowed.");
    }

    if (!isAddress(selection.astraTokenAddress)) {
      selectionIssues.push("ASTRA token address must be a 0x address with 40 hex characters.");
    }

    if (!isAddress(selection.counterAssetAddress)) {
      selectionIssues.push("Counter asset address must be a 0x address with 40 hex characters.");
    }

    for (const key of [
      "approvesPoolCreation",
      "approvesLiquidityProvision",
      "approvesPublicTrading",
      "generatesSafePayload",
      "movesFunds",
      "activatesBuyPage"
    ]) {
      if (selection[key] !== false) {
        selectionIssues.push(`${key} must be false.`);
      }
    }

    if (!Number.isFinite(Date.parse(selection.selectedAt))) {
      selectionIssues.push("selectedAt must be a valid ISO timestamp.");
    }
  }

  selectionValid = selectionIssues.length === 0 && Boolean(selection);
}

check(checks, "Imported selection valid if present", !fs.existsSync(selectionPath) || selectionValid, {
  selectionFilePresent: fs.existsSync(selectionPath),
  selectionIssues
});

const missingArtifacts = artifactPaths.filter((artifactPath) => {
  return !fs.existsSync(path.join(root, artifactPath));
});

for (const artifactPath of missingArtifacts) {
  check(checks, `Selection import artifact exists: ${artifactPath}`, false, { artifactPath });
}

const artifactHashes = artifactPaths
  .filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)))
  .map((artifactPath) => sha256File(artifactPath));

if (fs.existsSync(selectionPath)) {
  artifactHashes.push(sha256File(selectionRelativePath));
}

const payload = {
  schema: "astra-dex-liquidity-parameter-selection-payload-v0.1",
  currentApprovedMode: "restricted-mainnet-operation",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  selectionImportOnly: true,
  selectionFilePresent: fs.existsSync(selectionPath),
  selectionValid,
  artifactHashes
};

const selectionImportHash = sha256Json(payload);
const failures = checks.filter((item) => !item.pass);

const status = failures.length > 0
  ? "DEX_LIQUIDITY_PARAMETER_SELECTION_IMPORT_REVIEW_REQUIRED"
  : selectionValid
    ? "DEX_LIQUIDITY_PARAMETER_SELECTION_IMPORTED_NOT_APPROVED"
    : "DEX_LIQUIDITY_PARAMETER_SELECTION_IMPORT_READY_NO_SELECTION";

const selectionSummary = selection
  ? {
      selectionId: selection.selectionId || "",
      dexVenue: selection.dexVenue || "",
      poolVersion: selection.poolVersion || "",
      tokenPair: selection.tokenPair || "",
      astraTokenAddress: selection.astraTokenAddress || "",
      counterAssetSymbol: selection.counterAssetSymbol || "",
      counterAssetAddress: selection.counterAssetAddress || "",
      feeTierOrPoolType: selection.feeTierOrPoolType || "",
      initialPriceApproach: selection.initialPriceApproach || "",
      initialPriceHuman: selection.initialPriceHuman || "",
      liquidityAmountAstra: selection.liquidityAmountAstra || "",
      liquidityAmountCounterAsset: selection.liquidityAmountCounterAsset || "",
      liquiditySource: selection.liquiditySource || "",
      priceRange: selection.priceRange || "",
      safeTransactionPath: selection.safeTransactionPath || "",
      publicTradingLinkPlan: selection.publicTradingLinkPlan || "",
      buyPageLanguage: selection.buyPageLanguage || "",
      selectedAt: selection.selectedAt || ""
    }
  : {
      selectionId: "no active selection",
      dexVenue: "none",
      poolVersion: "none",
      tokenPair: "none",
      astraTokenAddress: "none",
      counterAssetSymbol: "none",
      counterAssetAddress: "none",
      feeTierOrPoolType: "none",
      initialPriceApproach: "none",
      initialPriceHuman: "none",
      liquidityAmountAstra: "none",
      liquidityAmountCounterAsset: "none",
      liquiditySource: "none",
      priceRange: "none",
      safeTransactionPath: "none",
      publicTradingLinkPlan: "none",
      buyPageLanguage: "none",
      selectedAt: ""
    };

const report = {
  schema: "astra-dex-liquidity-parameter-selection-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement:
    selectionValid
      ? "AstraTreasury DEX/liquidity parameter selection has been imported for review. Parameters are not finalized, no pool is created, no liquidity is added, and public trading is not approved."
      : "AstraTreasury DEX/liquidity parameter selection import is ready. No selected parameters are imported, and DEX/liquidity trading remains not approved.",
  summary: {
    selectionFilePresent: fs.existsSync(selectionPath),
    selectionValid,
    selectionIssueCount: selectionIssues.length,
    artifactCount: artifactHashes.length,
    missingArtifactCount: missingArtifacts.length,
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    activeIncidents,
    responseRequired,
    monitorStatus: monitor.status || "UNKNOWN"
  },
  selectionImport: {
    selectionImportHash,
    hashAlgorithm: "SHA-256",
    selectionFile: selectionRelativePath,
    allowedPairs: config.allowedPairs || [],
    allowedPoolVersions: config.allowedPoolVersions || [],
    selectionSummary,
    selectionIssues,
    selectionParseError,
    artifactHashes
  },
  checks,
  failures,
  missingArtifacts,
  currentStatuses: {
    dexLiquidityParameters: parameterReview.status || "UNKNOWN",
    dexLiquidityPath: dexPath.status || "UNKNOWN",
    restrictedModeFinalRelease: finalRelease.status || "UNKNOWN",
    governanceDecision: governanceDecision.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    treasurySafeTransaction: treasurySafeTx.status || "UNKNOWN",
    monitor: monitor.status || "UNKNOWN",
    alerts: alerts.status || "UNKNOWN",
    incidents: incidents.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
  restrictions: {
    dexLiquidityPoolTrading: false,
    liquidityPoolCreation: false,
    liquidityProvision: false,
    publicTrading: false,
    buyPageActivation: false,
    realTreasuryFunding: false,
    mainnetExecutionQueue: false,
    safeTransactionPayloadGeneration: false,
    safeTransactionExecution: false
  },
  safety: {
    sendsTransactions: false,
    movesFunds: false,
    createsLiquidityPool: false,
    addsLiquidity: false,
    enablesPublicTrading: false,
    generatesSafePayload: false,
    activatesBuyPage: false,
    approvesFullLaunch: false
  }
};

writeJson(reportFile, report);
writeJson(publicJsonFile, report);

const selectionRows = Object.entries(selectionSummary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const issueRows = selectionIssues.length === 0
  ? '<tr><td>No selection issues.</td></tr>'
  : selectionIssues.map((item) => `<tr><td>${escapeHtml(item)}</td></tr>`).join("");

const checkRows = checks.map((item) => {
  return `<tr><td>${escapeHtml(item.name)}</td><td>${item.pass ? "PASS" : "FAIL"}</td><td><code>${escapeHtml(JSON.stringify(item.details))}</code></td></tr>`;
}).join("");

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury DEX Parameter Selection</title>
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
      margin-bottom: 16px;
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

    code {
      color: var(--muted);
      overflow-wrap: anywhere;
      font-size: 12px;
    }

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
    <div class="badge">Parameter selection · not approved</div>
    <h1>DEX Parameter Selection</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
    <p><strong>Selection import hash:</strong> <code>${escapeHtml(selectionImportHash)}</code></p>
  </section>

  <section class="card">
    <h2>Selection summary</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${selectionRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Selection issues</h2>
    <table>
      <thead><tr><th>Issue</th></tr></thead>
      <tbody>${issueRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Checks</h2>
    <table>
      <thead><tr><th>Check</th><th>Status</th><th>Details</th></tr></thead>
      <tbody>${checkRows}</tbody>
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
      Parameter selection import does not finalize the parameters, create a pool, add liquidity,
      generate a Safe payload, move funds, activate a buy page, or approve public trading.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-liquidity-parameter-selection">/api/public/dex-liquidity-parameter-selection</a></p>
    <p><a href="/dex-liquidity-parameters">DEX Liquidity Parameters</a></p>
    <p><a href="/dex-liquidity-path">DEX/Liquidity Path</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Liquidity Parameter Selection Import");
console.log("======================================================");
console.log(`Status: ${report.status}`);
console.log(`Selection file present: ${report.summary.selectionFilePresent}`);
console.log(`Selection valid: ${report.summary.selectionValid}`);
console.log(`Selection import hash: ${selectionImportHash}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
