import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

const HOST = process.env.PUBLIC_SITE_HOST || "127.0.0.1";
const PORT = Number(process.env.PUBLIC_SITE_PORT || "8790");

const docsDir = path.join(projectRoot, "public-docs");
const verificationDir = path.join(projectRoot, "reports", "verification");
const opsLatestStatusFile = path.join(projectRoot, "reports", "ops", "latest-status.json");
const deploymentEnvFile = path.join(projectRoot, "deployments", "base-sepolia.env");

loadEnvFile(deploymentEnvFile);

const CONTRACTS = [
  ["AstraToken", "ASTRA_TOKEN", "Fixed-supply ERC-20 testnet token"],
  ["TreasuryPolicy", "ASTRA_POLICY", "Policy rules for allowed treasury actions"],
  ["TreasuryVault", "ASTRA_VAULT", "Treasury custody contract"],
  ["SignalRegistry", "ASTRA_SIGNAL_REGISTRY", "On-chain AI signal registry"],
  ["ExecutionController", "ASTRA_CONTROLLER", "Policy-gated execution controller"]
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;

    const key = match[1];
    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return {
      error: error.message
    };
  }
}

function readText(filePath, fallback = "") {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return fs.readFileSync(filePath, "utf8");
  } catch (_error) {
    return fallback;
  }
}

function htmlEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function jsonResponse(res, body, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });

  res.end(JSON.stringify(body, null, 2));
}

function textResponse(res, body, status = 200, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type
  });

  res.end(body);
}

function getContractRows() {
  return CONTRACTS.map(([name, envName, purpose]) => {
    const address = process.env[envName] || "";

    return {
      name,
      envName,
      address,
      purpose,
      baseScanUrl: address
        ? `https://sepolia.basescan.org/address/${address}`
        : null
    };
  });
}

function getVerificationSummary() {
  const summary = readJson(path.join(verificationDir, "base-sepolia-contracts.json"), null);

  return {
    generated: Boolean(summary),
    compilerVersion: summary?.compilerVersion || null,
    evmVersion: summary?.evmVersion || null,
    optimizer: summary?.optimizer || null,
    assets: {
      standardJsonInput: "reports/verification/standard-json-input.json",
      constructorArgs: "reports/verification/constructor-args-no-0x/",
      manualGuide: "reports/verification/manual-basescan-verification.md"
    }
  };
}

function getSanitizedOpsStatus() {
  const ops = readJson(opsLatestStatusFile, null);

  if (!ops) {
    return {
      available: false,
      status: "UNKNOWN",
      generatedAt: null
    };
  }

  return {
    available: true,
    status: ops.status || "UNKNOWN",
    generatedAt: ops.generatedAt || null,
    checks: {
      dashboardResponding: Boolean(ops.checks?.dashboardResponding),
      paperApiResponding: Boolean(ops.checks?.paperApiResponding),
      paperLoopHealthy: Boolean(ops.checks?.paperLoopHealthy),
      deploymentFilePresent: Boolean(ops.checks?.deploymentFilePresent),
      paperStatePresent: Boolean(ops.checks?.paperStatePresent)
    }
  };
}

function getPublicStatus() {
  return {
    app: "AstraTreasury Protocol Public Site",
    generatedAt: new Date().toISOString(),
    network: {
      name: "Base Sepolia",
      chainId: 84532,
      explorer: "https://sepolia.basescan.org"
    },
    prototypeNotice: {
      testnetOnly: true,
      noInvestmentProduct: true,
      noReturnPromise: true,
      message:
        "AstraTreasury is currently a Base Sepolia testnet prototype. Testnet ASTP has no real monetary value."
    },
    contracts: getContractRows(),
    verification: getVerificationSummary(),
    status: getSanitizedOpsStatus()
  };
}

function indexHtml() {
  const publicStatus = getPublicStatus();
  const contracts = publicStatus.contracts;
  const opsStatus = publicStatus.status.status;
  const opsClass = opsStatus === "OK" ? "ok" : "warn";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>AstraTreasury Protocol</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #0d1117; color: #e6edf3; }
    header { padding: 32px; background: #010409; border-bottom: 1px solid #30363d; }
    main { padding: 24px 32px 56px; display: grid; gap: 18px; }
    h1 { margin: 0 0 8px; font-size: 30px; }
    h2 { margin-top: 0; color: #58a6ff; }
    a { color: #58a6ff; }
    .muted { color: #8b949e; overflow-wrap: anywhere; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 14px; padding: 18px; box-shadow: 0 12px 30px rgba(0,0,0,.2); }
    .big { font-size: 26px; font-weight: 700; }
    .ok { color: #3fb950; font-weight: 700; }
    .warn { color: #d29922; font-weight: 700; }
    .danger { color: #f85149; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; border-bottom: 1px solid #30363d; padding: 10px 8px; vertical-align: top; }
    th { color: #58a6ff; font-size: 13px; }
    td { font-size: 13px; overflow-wrap: anywhere; }
    code { background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 2px 5px; }
    .pill { display: inline-block; padding: 4px 9px; border-radius: 999px; background: #21262d; border: 1px solid #30363d; }
  </style>
</head>
<body>
  <header>
    <h1>AstraTreasury Protocol</h1>
    <div class="muted">
      AI-assisted treasury workflow prototype on Base Sepolia.
      Public read-only project site.
    </div>
  </header>

  <main>
    <section class="grid">
      <div class="card">
        <h2>Network</h2>
        <div class="big">Base Sepolia</div>
        <div class="muted">Chain ID: 84532</div>
      </div>

      <div class="card">
        <h2>Status</h2>
        <div class="big ${opsClass}">${htmlEscape(opsStatus)}</div>
        <div class="muted">Sanitized public status only</div>
      </div>

      <div class="card">
        <h2>Safety Model</h2>
        <div class="big">Human-in-the-loop</div>
        <div class="muted">Separate signal approval and execution approval queues</div>
      </div>

      <div class="card">
        <h2>Prototype Notice</h2>
        <div class="big danger">Testnet only</div>
        <div class="muted">No investment product. No promise of returns. Testnet ASTP has no real monetary value.</div>
      </div>
    </section>

    <section class="card">
      <h2>Contracts</h2>
      <table>
        <thead>
          <tr>
            <th>Contract</th>
            <th>Address</th>
            <th>Purpose</th>
            <th>BaseScan</th>
          </tr>
        </thead>
        <tbody>
          ${contracts.map((contract) => `
            <tr>
              <td><span class="pill">${htmlEscape(contract.name)}</span></td>
              <td><code>${htmlEscape(contract.address)}</code></td>
              <td>${htmlEscape(contract.purpose)}</td>
              <td>${contract.baseScanUrl ? `<a href="${contract.baseScanUrl}" target="_blank" rel="noreferrer">Open</a>` : "Missing"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>

    <section class="card">
      <h2>Workflow</h2>
      <p class="muted">
        AstraTreasury separates AI-generated paper signals from treasury execution.
        Signals are reviewed locally, submitted on-chain only after approval, then converted into execution proposals that must pass the live TreasuryPolicy contract and a second manual approval.
      </p>
      <pre><code>AI paper signal
→ signal approval queue
→ SignalRegistry
→ policy-aware execution queue
→ TreasuryPolicy check
→ manual execution approval
→ ExecutionController
→ TreasuryVault</code></pre>
    </section>

    <section class="card">
      <h2>Documentation</h2>
      <ul>
        <li><a href="/docs/README.md">Project README</a></li>
        <li><a href="/docs/contracts.md">Contracts</a></li>
        <li><a href="/docs/safety-workflow.md">Safety workflow</a></li>
        <li><a href="/docs/dashboard-api.md">Dashboard/API</a></li>
        <li><a href="/docs/verification.md">Verification</a></li>
        <li><a href="/audit">Audit readiness</a></li>\n        <li><a href="/governance">Governance gate</a></li>\n        <li><a href="/transparency">Transparency index</a></li>\n        <li><a href="/evidence">Evidence archive</a></li>\n        <li><a href="/packages">Package inventory</a></li>\n        <li><a href="/mainnet">Base Mainnet deployment</a></li>\n        <li><a href="/live">Mainnet live status</a></li>\n        <li><a href="/restricted-operations">Restricted operations</a></li>\n        <li><a href="/monitor">Mainnet monitor</a></li>\n        <li><a href="/mainnet-execution">Mainnet execution queue</a></li>\n        <li><a href="/mainnet-events">Mainnet event monitor</a></li>\n        <li><a href="/alerts">Mainnet alerts</a></li>\n        <li><a href="/incidents">Incident summary</a></li>\n        <li><a href="/launch">Restricted launch status</a></li>\n        <li><a href="/announcement">Restricted launch announcement</a></li>\n        <li><a href="/announcement-publication">Announcement publication status</a></li>\n        <li><a href="/post-announcement">Post-announcement monitoring</a></li>\n        <li><a href="/stabilization">Restricted launch stabilization</a></li>\n        <li><a href="/roadmap">Capability roadmap</a></li>\n        <li><a href="/full-launch">Full launch readiness</a></li>\n        <li><a href="/full-launch-governance">Full-launch governance</a></li>\n        <li><a href="/full-launch-governance-vote">Full-launch governance vote</a></li>\n        <li><a href="/full-launch-governance-vote-opening">Governance vote opening</a></li>\n        <li><a href="/full-launch-governance-vote-authorization">Governance vote authorization</a></li>\n        <li><a href="/full-launch-governance-vote-opening-execution">Governance vote opening execution</a></li>\n        <li><a href="/full-launch-governance-resolution">Governance resolution</a></li>\n        <li><a href="/full-launch-governance-resolution-authorization">Governance resolution authorization</a></li>\n        <li><a href="/full-launch-governance-decision-recording">Governance decision recording</a></li>\n        <li><a href="/full-launch-governance-decision-recording-authorization">Governance decision authorization</a></li>\n        <li><a href="/legal-full-launch">Legal full-launch review</a></li>\n        <li><a href="/treasury-funding">Treasury funding readiness</a></li>\n        <li><a href="/treasury-risk">Treasury risk limits</a></li>\n        <li><a href="/treasury-source">Treasury funding source</a></li>\n        <li><a href="/treasury-safe">Treasury Safe approval</a></li>\n        <li><a href="/treasury-transaction-dry-run">Treasury transaction dry run</a></li>\n        <li><a href="/treasury-disclosure">Treasury Disclosure approval</a></li>\n        <li><a href="/treasury-safe-transaction">Treasury Safe transaction package</a></li>\n        <li><a href="/execution-dry-run">Execution dry run v2</a></li>\n        <li><a href="/disclosures">Public disclosures</a></li>\n        <li><a href="/token">AstraToken</a></li>\n        <li><a href="/wallet">Add ASTP to wallet</a></li>\n        <li><a href="/brand">Brand kit</a></li>\n        <li><a href="/market">Market data</a></li>\n        <li><a href="/trust">Trust Center</a></li>\n        <li><a href="/launch-control">Launch Control</a></li>\n        <li><a href="/capability-matrix">Capability Matrix</a></li>\n        <li><a href="/public-status-update">Public Status Update</a></li>\n        <li><a href="/governance-decision-approval">Governance decision approval</a></li>\n        <li><a href="/governance-decision-live-precheck">Governance decision live precheck</a></li>\n        <li><a href="/governance-decision">Governance decision</a></li>\n        <li><a href="/restricted-mode-final-status">Restricted-mode final status</a></li>\n        <li><a href="/restricted-mode-monitoring-baseline">Restricted-mode monitoring baseline</a></li>\n        <li><a href="/restricted-mode-evidence-seal">Restricted-mode evidence seal</a></li>\n        <li><a href="/restricted-mode-release-candidate">Restricted-mode release candidate</a></li>\n        <li><a href="/restricted-mode-final-release">Restricted-mode final release</a></li>\n        <li><a href="/restricted-mode-operations-handoff">Restricted-mode operations handoff</a></li>\n        <li><a href="/restricted-mode-maintenance-schedule">Restricted-mode maintenance schedule</a></li>\n        <li><a href="/restricted-mode-operator-checklist">Restricted-mode operator checklist</a></li>\n        <li><a href="/capability-activation-intake">Capability activation intake</a></li>\n        <li><a href="/capability-request-import">Capability request import</a></li>\n        <li><a href="/capability-request-review">Capability request review</a></li>\n        <li><a href="/dex-liquidity-path">DEX/liquidity path</a></li>\n        <li><a href="/dex-liquidity-parameters">DEX liquidity parameters</a></li>\n        <li><a href="/dex-liquidity-parameter-selection">DEX liquidity parameter selection</a></li>\n        <li><a href="/dex-liquidity-parameter-finalization">DEX liquidity parameter finalization</a></li>\n        <li><a href="/dex-liquidity-parameter-approval">DEX liquidity parameter approval</a></li>\n        <li><a href="/dex-liquidity-source-safe-impact">DEX liquidity source/Safe impact</a></li>\n        <li><a href="/dex-pool-creation-readiness">DEX pool creation readiness</a></li>\n        <li><a href="/dex-pool-existence-precheck">DEX pool existence precheck</a></li>\n        <li><a href="/dex-pool-creation-approval">DEX pool creation approval</a></li>\n        <li><a href="/dex-pool-creation-execution-precheck">DEX pool creation execution precheck</a></li>\n        <li><a href="/dex-pool-creation-safe-payload-preparation">DEX pool creation Safe payload preparation</a></li>\n        <li><a href="/dex-pool-creation-safe-payload-draft">DEX pool creation Safe payload draft</a></li>\n        <li><a href="/dex-pool-creation-safe-payload-draft-review">DEX pool creation Safe payload draft review</a></li>\n        <li><a href="/dex-pool-creation-token-ordering-sqrtprice">DEX token ordering and sqrtPriceX96 review</a></li>\n        <li><a href="/dex-pool-creation-factory-router-review">DEX factory/router execution path review</a></li>\n        <li><a href="/dex-pool-creation-safe-owners-threshold">DEX Safe owners and threshold review</a></li>\n        <li><a href="/dex-pool-creation-safe-payload-generation-approval">DEX Safe payload generation approval</a></li>\n        <li><a href="/dex-pool-creation-safe-payload-generation">DEX Safe payload generation</a></li>\n        <li><a href="/dex-pool-creation-safe-payload-verification">DEX Safe payload verification</a></li>\n        <li><a href="/dex-pool-creation-safe-submission-approval">DEX Safe submission approval</a></li>\n        <li><a href="/dex-pool-creation-safe-submission-preparation">DEX Safe submission preparation</a></li>\n        <li><a href="/dex-pool-creation-safe-submission-dry-run">DEX Safe submission dry run</a></li>\n        <li><a href="/dex-pool-creation-safe-submission-execution-approval">DEX Safe submission execution approval</a></li>\n        <li><a href="/dex-pool-creation-safe-submission-live">DEX Safe submission live</a></li>\n        <li><a href="/governance-vote-result-evidence">Governance vote/result evidence</a></li>\n        <li><a href="/signed-governance-resolution-evidence">Signed governance resolution evidence</a></li>\n        <li><a href="/faq">FAQ</a></li>\n        <li><a href="/api">API directory</a></li>\n        <li><a href="/security">Security</a></li>\n        <li><a href="/architecture">Architecture</a></li>\n        <li><a href="/protocol">Protocol</a></li>
      </ul>
    </section>

    <section class="card">
      <h2>Public API</h2>
      <ul>
        <li><a href="/api/public/status">/api/public/status</a></li>
        <li><a href="/api/public/contracts">/api/public/contracts</a></li>
        <li><a href="/api/public/verification">/api/public/verification</a></li>
        <li><a href="/api/public/audit">/api/public/audit</a></li>\n        <li><a href="/api/public/governance">/api/public/governance</a></li>\n        <li><a href="/api/public/transparency">/api/public/transparency</a></li>\n        <li><a href="/api/public/evidence">/api/public/evidence</a></li>\n        <li><a href="/api/public/packages">/api/public/packages</a></li>\n        <li><a href="/api/public/mainnet">/api/public/mainnet</a></li>\n        <li><a href="/api/public/live">/api/public/live</a></li>\n        <li><a href="/api/public/restricted-operations">/api/public/restricted-operations</a></li>\n        <li><a href="/api/public/monitor">/api/public/monitor</a></li>\n        <li><a href="/api/public/mainnet-execution">/api/public/mainnet-execution</a></li>\n        <li><a href="/api/public/mainnet-events">/api/public/mainnet-events</a></li>\n        <li><a href="/api/public/alerts">/api/public/alerts</a></li>\n        <li><a href="/api/public/incidents">/api/public/incidents</a></li>\n        <li><a href="/api/public/launch">/api/public/launch</a></li>\n        <li><a href="/api/public/announcement">/api/public/announcement</a></li>\n        <li><a href="/api/public/announcement-publication">/api/public/announcement-publication</a></li>\n        <li><a href="/api/public/post-announcement">/api/public/post-announcement</a></li>\n        <li><a href="/api/public/stabilization">/api/public/stabilization</a></li>\n        <li><a href="/api/public/roadmap">/api/public/roadmap</a></li>\n        <li><a href="/api/public/full-launch">/api/public/full-launch</a></li>\n        <li><a href="/api/public/full-launch-governance">/api/public/full-launch-governance</a></li>\n        <li><a href="/api/public/full-launch-governance-vote">/api/public/full-launch-governance-vote</a></li>\n        <li><a href="/api/public/full-launch-governance-vote-opening">/api/public/full-launch-governance-vote-opening</a></li>\n        <li><a href="/api/public/full-launch-governance-vote-authorization">/api/public/full-launch-governance-vote-authorization</a></li>\n        <li><a href="/api/public/full-launch-governance-vote-opening-execution">/api/public/full-launch-governance-vote-opening-execution</a></li>\n        <li><a href="/api/public/full-launch-governance-resolution">/api/public/full-launch-governance-resolution</a></li>\n        <li><a href="/api/public/full-launch-governance-resolution-authorization">/api/public/full-launch-governance-resolution-authorization</a></li>\n        <li><a href="/api/public/full-launch-governance-decision-recording">/api/public/full-launch-governance-decision-recording</a></li>\n        <li><a href="/api/public/full-launch-governance-decision-recording-authorization">/api/public/full-launch-governance-decision-recording-authorization</a></li>\n        <li><a href="/api/public/legal-full-launch">/api/public/legal-full-launch</a></li>\n        <li><a href="/api/public/treasury-funding">/api/public/treasury-funding</a></li>\n        <li><a href="/api/public/treasury-risk">/api/public/treasury-risk</a></li>\n        <li><a href="/api/public/treasury-source">/api/public/treasury-source</a></li>\n        <li><a href="/api/public/treasury-safe">/api/public/treasury-safe</a></li>\n        <li><a href="/api/public/treasury-transaction-dry-run">/api/public/treasury-transaction-dry-run</a></li>\n        <li><a href="/api/public/treasury-disclosure">/api/public/treasury-disclosure</a></li>\n        <li><a href="/api/public/treasury-safe-transaction">/api/public/treasury-safe-transaction</a></li>\n        <li><a href="/api/public/execution-dry-run">/api/public/execution-dry-run</a></li>\n        <li><a href="/api/public/disclosures">/api/public/disclosures</a></li>\n        <li><a href="/api/public/home">/api/public/home</a></li>\n        <li><a href="/api/public/token">/api/public/token</a></li>\n        <li><a href="/api/public/wallet">/api/public/wallet</a></li>\n        <li><a href="/api/public/brand">/api/public/brand</a></li>\n        <li><a href="/api/public/market">/api/public/market</a></li>\n        <li><a href="/api/public/trust">/api/public/trust</a></li>\n        <li><a href="/api/public/launch-control">/api/public/launch-control</a></li>\n        <li><a href="/api/public/capability-matrix">/api/public/capability-matrix</a></li>\n        <li><a href="/api/public/public-status-update">/api/public/public-status-update</a></li>\n        <li><a href="/api/public/governance-decision-approval">/api/public/governance-decision-approval</a></li>\n        <li><a href="/api/public/governance-decision-live-precheck">/api/public/governance-decision-live-precheck</a></li>\n        <li><a href="/api/public/governance-decision">/api/public/governance-decision</a></li>\n        <li><a href="/api/public/restricted-mode-final-status">/api/public/restricted-mode-final-status</a></li>\n        <li><a href="/api/public/restricted-mode-monitoring-baseline">/api/public/restricted-mode-monitoring-baseline</a></li>\n        <li><a href="/api/public/restricted-mode-evidence-seal">/api/public/restricted-mode-evidence-seal</a></li>\n        <li><a href="/api/public/restricted-mode-release-candidate">/api/public/restricted-mode-release-candidate</a></li>\n        <li><a href="/api/public/restricted-mode-final-release">/api/public/restricted-mode-final-release</a></li>\n        <li><a href="/api/public/restricted-mode-operations-handoff">/api/public/restricted-mode-operations-handoff</a></li>\n        <li><a href="/api/public/restricted-mode-maintenance-schedule">/api/public/restricted-mode-maintenance-schedule</a></li>\n        <li><a href="/api/public/restricted-mode-operator-checklist">/api/public/restricted-mode-operator-checklist</a></li>\n        <li><a href="/api/public/capability-activation-intake">/api/public/capability-activation-intake</a></li>\n        <li><a href="/api/public/capability-request-import">/api/public/capability-request-import</a></li>\n        <li><a href="/api/public/capability-request-review">/api/public/capability-request-review</a></li>\n        <li><a href="/api/public/dex-liquidity-path">/api/public/dex-liquidity-path</a></li>\n        <li><a href="/api/public/dex-liquidity-parameters">/api/public/dex-liquidity-parameters</a></li>\n        <li><a href="/api/public/dex-liquidity-parameter-selection">/api/public/dex-liquidity-parameter-selection</a></li>\n        <li><a href="/api/public/dex-liquidity-parameter-finalization">/api/public/dex-liquidity-parameter-finalization</a></li>\n        <li><a href="/api/public/dex-liquidity-parameter-approval">/api/public/dex-liquidity-parameter-approval</a></li>\n        <li><a href="/api/public/dex-liquidity-source-safe-impact">/api/public/dex-liquidity-source-safe-impact</a></li>\n        <li><a href="/api/public/dex-pool-creation-readiness">/api/public/dex-pool-creation-readiness</a></li>\n        <li><a href="/api/public/dex-pool-existence-precheck">/api/public/dex-pool-existence-precheck</a></li>\n        <li><a href="/api/public/dex-pool-creation-approval">/api/public/dex-pool-creation-approval</a></li>\n        <li><a href="/api/public/dex-pool-creation-execution-precheck">/api/public/dex-pool-creation-execution-precheck</a></li>\n        <li><a href="/api/public/dex-pool-creation-safe-payload-preparation">/api/public/dex-pool-creation-safe-payload-preparation</a></li>\n        <li><a href="/api/public/dex-pool-creation-safe-payload-draft">/api/public/dex-pool-creation-safe-payload-draft</a></li>\n        <li><a href="/api/public/dex-pool-creation-safe-payload-draft-review">/api/public/dex-pool-creation-safe-payload-draft-review</a></li>\n        <li><a href="/api/public/dex-pool-creation-token-ordering-sqrtprice">/api/public/dex-pool-creation-token-ordering-sqrtprice</a></li>\n        <li><a href="/api/public/dex-pool-creation-factory-router-review">/api/public/dex-pool-creation-factory-router-review</a></li>\n        <li><a href="/api/public/dex-pool-creation-safe-owners-threshold">/api/public/dex-pool-creation-safe-owners-threshold</a></li>\n        <li><a href="/api/public/dex-pool-creation-safe-payload-generation-approval">/api/public/dex-pool-creation-safe-payload-generation-approval</a></li>\n        <li><a href="/api/public/dex-pool-creation-safe-payload-generation">/api/public/dex-pool-creation-safe-payload-generation</a></li>\n        <li><a href="/api/public/dex-pool-creation-safe-payload-verification">/api/public/dex-pool-creation-safe-payload-verification</a></li>\n        <li><a href="/api/public/dex-pool-creation-safe-submission-approval">/api/public/dex-pool-creation-safe-submission-approval</a></li>\n        <li><a href="/api/public/dex-pool-creation-safe-submission-preparation">/api/public/dex-pool-creation-safe-submission-preparation</a></li>\n        <li><a href="/api/public/dex-pool-creation-safe-submission-dry-run">/api/public/dex-pool-creation-safe-submission-dry-run</a></li>\n        <li><a href="/api/public/dex-pool-creation-safe-submission-execution-approval">/api/public/dex-pool-creation-safe-submission-execution-approval</a></li>\n        <li><a href="/api/public/dex-pool-creation-safe-submission-live">/api/public/dex-pool-creation-safe-submission-live</a></li>\n        <li><a href="/api/public/governance-vote-result-evidence">/api/public/governance-vote-result-evidence</a></li>\n        <li><a href="/api/public/signed-governance-resolution-evidence">/api/public/signed-governance-resolution-evidence</a></li>\n        <li><a href="/api/public/faq">/api/public/faq</a></li>\n        <li><a href="/api/public/api-directory">/api/public/api-directory</a></li>\n        <li><a href="/api/public/security">/api/public/security</a></li>\n        <li><a href="/api/public/architecture">/api/public/architecture</a></li>\n        <li><a href="/api/public/protocol">/api/public/protocol</a></li>
        <li><a href="/healthz">/healthz</a></li>
      </ul>
    </section>
  </main>
</body>
</html>`;
}

function serveDoc(res, requestedName) {
  const allowedDocs = new Set([
    "README.md",
    "contracts.md",
    "safety-workflow.md",
    "dashboard-api.md",
    "verification.md",
    "audit.html",
    "audit-status.json"
  ]);

  if (!allowedDocs.has(requestedName)) {
    textResponse(res, "Not found\n", 404);
    return;
  }

  const filePath = path.join(docsDir, requestedName);

  if (!fs.existsSync(filePath)) {
    textResponse(res, "Document not generated yet. Run: npm run docs:public\n", 404);
    return;
  }

  textResponse(res, readText(filePath), 200, "text/markdown; charset=utf-8");
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    // ASTRA_HOMEPAGE_REFRESH_ROUTES_V1
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const filePath = path.join(docsDir, "index.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Homepage not generated yet. Run: npm run docs:home-public\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/home") {
      const filePath = path.join(docsDir, "home-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Homepage status not generated yet. Run: npm run docs:home-public" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public" || url.pathname === "/api/public/") {
      jsonResponse(res, {
        schema: "astra-public-api-index-v0.1",
        generatedAt: new Date().toISOString(),
        project: "AstraTreasury Protocol",
        endpoints: [
          "/api/public/home",
          "/api/public/status",
          "/api/public/contracts",
          "/api/public/verification",
          "/api/public/audit",
          "/api/public/governance",
          "/api/public/transparency",
          "/api/public/evidence",
          "/api/public/packages",
          "/api/public/mainnet",
          "/api/public/live",
          "/api/public/restricted-operations",
          "/api/public/monitor",
          "/api/public/mainnet-execution",
          "/api/public/mainnet-events",
          "/api/public/alerts",
          "/api/public/incidents",
          "/api/public/launch",
          "/api/public/announcement",
          "/api/public/announcement-publication",
          "/api/public/post-announcement",
          "/api/public/stabilization",
          "/api/public/roadmap"
        ]
      }, 200);
      return;
    }


    if (url.pathname === "/") {
      textResponse(res, indexHtml(), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/audit") {
      const filePath = path.join(docsDir, "audit.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Audit page not generated yet. Run: npm run docs:audit-public\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/audit") {
      const filePath = path.join(docsDir, "audit-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Audit status not generated yet. Run: npm run docs:audit-public" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/governance") {
      const filePath = path.join(docsDir, "governance.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Governance page not generated yet. Run: npm run docs:governance-public\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/governance") {
      const filePath = path.join(docsDir, "governance-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Governance status not generated yet. Run: npm run docs:governance-public" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/transparency") {
      const filePath = path.join(docsDir, "transparency.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Transparency page not generated yet. Run: npm run docs:transparency-public\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/transparency") {
      const filePath = path.join(docsDir, "transparency-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Transparency status not generated yet. Run: npm run docs:transparency-public" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/evidence") {
      const filePath = path.join(docsDir, "evidence.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Evidence page not generated yet. Run: npm run evidence:archive:once\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/evidence") {
      const filePath = path.join(docsDir, "evidence-index.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Evidence index not generated yet. Run: npm run evidence:archive:once" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/packages") {
      const filePath = path.join(docsDir, "packages.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Package inventory not generated yet. Run: npm run docs:packages-public\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/packages") {
      const filePath = path.join(docsDir, "package-inventory.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Package inventory not generated yet. Run: npm run docs:packages-public" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/mainnet") {
      const filePath = path.join(docsDir, "mainnet.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Mainnet page not generated yet. Run: npm run docs:mainnet-public\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/mainnet") {
      const filePath = path.join(docsDir, "mainnet-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Mainnet status not generated yet. Run: npm run docs:mainnet-public" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/live") {
      const filePath = path.join(docsDir, "live.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Live status page not generated yet. Run: npm run docs:live-public\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/live") {
      const filePath = path.join(docsDir, "live-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Live status not generated yet. Run: npm run docs:live-public" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/restricted-operations") {
      const filePath = path.join(docsDir, "restricted-operations.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Restricted operations page not generated yet. Run: npm run mainnet:restricted:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/restricted-operations") {
      const filePath = path.join(docsDir, "restricted-operations-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Restricted operations status not generated yet. Run: npm run mainnet:restricted:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/monitor") {
      const filePath = path.join(docsDir, "monitor.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Monitor page not generated yet. Run: npm run mainnet:monitor:once\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/monitor") {
      const filePath = path.join(docsDir, "mainnet-monitor-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Monitor status not generated yet. Run: npm run mainnet:monitor:once" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/mainnet-execution") {
      const filePath = path.join(docsDir, "mainnet-execution.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Mainnet execution page not generated yet. Run: npm run mainnet:execution:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/mainnet-execution") {
      const filePath = path.join(docsDir, "mainnet-execution-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Mainnet execution status not generated yet. Run: npm run mainnet:execution:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/mainnet-events") {
      const filePath = path.join(docsDir, "mainnet-events.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Mainnet events page not generated yet. Run: npm run mainnet:events:once\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/mainnet-events") {
      const filePath = path.join(docsDir, "mainnet-event-monitor-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Mainnet event monitor status not generated yet. Run: npm run mainnet:events:once" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/alerts") {
      const filePath = path.join(docsDir, "alerts.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Alerts page not generated yet. Run: npm run mainnet:alerts:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/alerts") {
      const filePath = path.join(docsDir, "mainnet-alerts-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Mainnet alert status not generated yet. Run: npm run mainnet:alerts:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/incidents") {
      const filePath = path.join(docsDir, "incidents.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Incident summary not generated yet. Run: npm run incident:report\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/incidents") {
      const filePath = path.join(docsDir, "incident-summary.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Incident summary not generated yet. Run: npm run incident:report" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/launch") {
      const filePath = path.join(docsDir, "launch.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Launch status not generated yet. Run: npm run mainnet:launch:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/launch") {
      const filePath = path.join(docsDir, "restricted-launch-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Launch status not generated yet. Run: npm run mainnet:launch:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/announcement") {
      const filePath = path.join(docsDir, "announcement.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Announcement page not generated yet. Run: npm run announcement:public\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/announcement") {
      const filePath = path.join(docsDir, "announcement-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Announcement status not generated yet. Run: npm run announcement:public" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/announcement-publication") {
      const filePath = path.join(docsDir, "announcement-publication.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Announcement publication status not generated yet. Run: npm run announcement:publication:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/announcement-publication") {
      const filePath = path.join(docsDir, "announcement-publication-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Announcement publication status not generated yet. Run: npm run announcement:publication:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/post-announcement") {
      const filePath = path.join(docsDir, "post-announcement.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Post-announcement status not generated yet. Run: npm run post:announcement:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/post-announcement") {
      const filePath = path.join(docsDir, "post-announcement-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Post-announcement status not generated yet. Run: npm run post:announcement:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/stabilization") {
      const filePath = path.join(docsDir, "stabilization.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Stabilization report not generated yet. Run: npm run stabilization:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/stabilization") {
      const filePath = path.join(docsDir, "stabilization-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Stabilization status not generated yet. Run: npm run stabilization:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/roadmap") {
      const filePath = path.join(docsDir, "roadmap.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Capability roadmap not generated yet. Run: npm run roadmap:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/roadmap") {
      const filePath = path.join(docsDir, "capability-roadmap-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Capability roadmap not generated yet. Run: npm run roadmap:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const filePath = path.join(docsDir, "index.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Homepage not generated yet. Run: npm run docs:home-public\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/home") {
      const filePath = path.join(docsDir, "home-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Homepage status not generated yet. Run: npm run docs:home-public" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname.startsWith("/assets/token/")) {
      const filename = path.basename(url.pathname);
      const filePath = path.join(docsDir, "assets", "token", filename);

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Token asset not found\n", 404);
        return;
      }

      const contentType = filename.endsWith(".png") ? "image/png" : "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400"
      });
      res.end(fs.readFileSync(filePath));
      return;
    }

    if (url.pathname === "/token") {
      const filePath = path.join(docsDir, "token.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Token page not generated yet. Run: npm run token:metadata\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/token") {
      const filePath = path.join(docsDir, "token-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Token metadata not generated yet. Run: npm run token:metadata" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/astratreasury-tokenlist.json") {
      const filePath = path.join(docsDir, "astratreasury-tokenlist.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Token list not generated yet. Run: npm run token:metadata" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/wallet") {
      const filePath = path.join(docsDir, "wallet.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Wallet page not generated yet. Run: npm run wallet:metadata\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/wallet") {
      const filePath = path.join(docsDir, "wallet-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Wallet metadata not generated yet. Run: npm run wallet:metadata" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/brand") {
      const filePath = path.join(docsDir, "brand.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Brand page not generated yet. Run: npm run brand:kit\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/brand") {
      const filePath = path.join(docsDir, "brand-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Brand metadata not generated yet. Run: npm run brand:kit" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/favicon.png" || url.pathname === "/apple-touch-icon.png" || url.pathname === "/og-image.png") {
      const filename = path.basename(url.pathname);
      const filePath = path.join(docsDir, filename);

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Brand asset not found\n", 404);
        return;
      }

      res.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400"
      });
      res.end(fs.readFileSync(filePath));
      return;
    }

    if (url.pathname.startsWith("/assets/brand/")) {
      const filename = path.basename(url.pathname);
      const filePath = path.join(docsDir, "assets", "brand", filename);

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Brand asset not found\n", 404);
        return;
      }

      res.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400"
      });
      res.end(fs.readFileSync(filePath));
      return;
    }

    if (url.pathname === "/market") {
      const filePath = path.join(docsDir, "market.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Market page not generated yet. Run: npm run market:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/market") {
      const filePath = path.join(docsDir, "market-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Market status not generated yet. Run: npm run market:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/trust") {
      const filePath = path.join(docsDir, "trust.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Trust Center not generated yet. Run: npm run trust:center\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/trust") {
      const filePath = path.join(docsDir, "trust-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Trust Center status not generated yet. Run: npm run trust:center" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/protocol") {
      const filePath = path.join(docsDir, "protocol.html");
      if (!fs.existsSync(filePath)) {
        textResponse(res, "Protocol page not generated yet. Run: npm run website:professional\n", 404);
        return;
      }
      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/protocol") {
      const filePath = path.join(docsDir, "protocol-status.json");
      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Protocol status not generated yet. Run: npm run website:professional" }, 404);
        return;
      }
      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/architecture") {
      const filePath = path.join(docsDir, "architecture.html");
      if (!fs.existsSync(filePath)) {
        textResponse(res, "Architecture page not generated yet. Run: npm run website:professional\n", 404);
        return;
      }
      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/architecture") {
      const filePath = path.join(docsDir, "architecture-status.json");
      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Architecture status not generated yet. Run: npm run website:professional" }, 404);
        return;
      }
      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/security") {
      const filePath = path.join(docsDir, "security.html");
      if (!fs.existsSync(filePath)) {
        textResponse(res, "Security page not generated yet. Run: npm run website:professional\n", 404);
        return;
      }
      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/security") {
      const filePath = path.join(docsDir, "security-status.json");
      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Security status not generated yet. Run: npm run website:professional" }, 404);
        return;
      }
      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/api") {
      const filePath = path.join(docsDir, "api.html");
      if (!fs.existsSync(filePath)) {
        textResponse(res, "API directory not generated yet. Run: npm run website:professional\n", 404);
        return;
      }
      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/api-directory") {
      const filePath = path.join(docsDir, "api-directory.json");
      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "API directory not generated yet. Run: npm run website:professional" }, 404);
        return;
      }
      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/faq") {
      const filePath = path.join(docsDir, "faq.html");
      if (!fs.existsSync(filePath)) {
        textResponse(res, "FAQ page not generated yet. Run: npm run website:professional\n", 404);
        return;
      }
      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/faq") {
      const filePath = path.join(docsDir, "faq-status.json");
      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "FAQ status not generated yet. Run: npm run website:professional" }, 404);
        return;
      }
      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/full-launch") {
      const filePath = path.join(docsDir, "full-launch.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Full launch readiness page not generated yet. Run: npm run full-launch:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/full-launch") {
      const filePath = path.join(docsDir, "full-launch-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Full launch readiness not generated yet. Run: npm run full-launch:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/legal-full-launch") {
      const filePath = path.join(docsDir, "legal-full-launch.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Legal full-launch page not generated yet. Run: npm run legal:full-launch:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/legal-full-launch") {
      const filePath = path.join(docsDir, "legal-full-launch-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Legal full-launch status not generated yet. Run: npm run legal:full-launch:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/treasury-funding") {
      const filePath = path.join(docsDir, "treasury-funding.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Treasury funding readiness page not generated yet. Run: npm run treasury:funding:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/treasury-funding") {
      const filePath = path.join(docsDir, "treasury-funding-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Treasury funding readiness not generated yet. Run: npm run treasury:funding:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/execution-dry-run") {
      const filePath = path.join(docsDir, "execution-dry-run.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Execution dry-run page not generated yet. Run: npm run execution:dry-run:v2:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/execution-dry-run") {
      const filePath = path.join(docsDir, "execution-dry-run-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Execution dry-run status not generated yet. Run: npm run execution:dry-run:v2:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/disclosures") {
      const filePath = path.join(docsDir, "disclosures.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Disclosures page not generated yet. Run: npm run disclosures:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/disclosures") {
      const filePath = path.join(docsDir, "disclosures-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Disclosures status not generated yet. Run: npm run disclosures:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/treasury-risk") {
      const filePath = path.join(docsDir, "treasury-risk.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Treasury risk page not generated yet. Run: npm run treasury:risk:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/treasury-risk") {
      const filePath = path.join(docsDir, "treasury-risk-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Treasury risk status not generated yet. Run: npm run treasury:risk:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/treasury-source") {
      const filePath = path.join(docsDir, "treasury-source.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Treasury source review page not generated yet. Run: npm run treasury:source:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/treasury-source") {
      const filePath = path.join(docsDir, "treasury-source-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Treasury source review not generated yet. Run: npm run treasury:source:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/treasury-safe") {
      const filePath = path.join(docsDir, "treasury-safe.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Treasury Safe approval page not generated yet. Run: npm run treasury:safe:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/treasury-safe") {
      const filePath = path.join(docsDir, "treasury-safe-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Treasury Safe approval not generated yet. Run: npm run treasury:safe:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/treasury-transaction-dry-run") {
      const filePath = path.join(docsDir, "treasury-transaction-dry-run.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Treasury transaction dry-run page not generated yet. Run: npm run treasury:tx-dry-run:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/treasury-transaction-dry-run") {
      const filePath = path.join(docsDir, "treasury-transaction-dry-run-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Treasury transaction dry-run status not generated yet. Run: npm run treasury:tx-dry-run:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/treasury-disclosure") {
      const filePath = path.join(docsDir, "treasury-disclosure.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Treasury Disclosure approval page not generated yet. Run: npm run treasury:disclosure:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/treasury-disclosure") {
      const filePath = path.join(docsDir, "treasury-disclosure-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Treasury Disclosure approval not generated yet. Run: npm run treasury:disclosure:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/treasury-safe-transaction") {
      const filePath = path.join(docsDir, "treasury-safe-transaction.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Treasury Safe transaction package page not generated yet. Run: npm run treasury:safe-tx:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/treasury-safe-transaction") {
      const filePath = path.join(docsDir, "treasury-safe-transaction-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Treasury Safe transaction package not generated yet. Run: npm run treasury:safe-tx:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/full-launch-governance") {
      const filePath = path.join(docsDir, "full-launch-governance.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Full-launch governance page not generated yet. Run: npm run full-launch:governance:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/full-launch-governance") {
      const filePath = path.join(docsDir, "full-launch-governance-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Full-launch governance status not generated yet. Run: npm run full-launch:governance:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/full-launch-governance-vote") {
      const filePath = path.join(docsDir, "full-launch-governance-vote.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Full-launch governance vote page not generated yet. Run: npm run full-launch:governance-vote:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/full-launch-governance-vote") {
      const filePath = path.join(docsDir, "full-launch-governance-vote-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Full-launch governance vote status not generated yet. Run: npm run full-launch:governance-vote:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/full-launch-governance-vote-opening") {
      const filePath = path.join(docsDir, "full-launch-governance-vote-opening.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Governance vote opening page not generated yet. Run: npm run full-launch:vote-opening:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/full-launch-governance-vote-opening") {
      const filePath = path.join(docsDir, "full-launch-governance-vote-opening-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Governance vote opening status not generated yet. Run: npm run full-launch:vote-opening:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/full-launch-governance-vote-authorization") {
      const filePath = path.join(docsDir, "full-launch-governance-vote-authorization.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Governance vote authorization page not generated yet. Run: npm run full-launch:vote-authorization:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/full-launch-governance-vote-authorization") {
      const filePath = path.join(docsDir, "full-launch-governance-vote-authorization-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Governance vote authorization status not generated yet. Run: npm run full-launch:vote-authorization:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/full-launch-governance-vote-opening-execution") {
      const filePath = path.join(docsDir, "full-launch-governance-vote-opening-execution.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Governance vote opening execution page not generated yet. Run: npm run full-launch:vote-opening-execution:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/full-launch-governance-vote-opening-execution") {
      const filePath = path.join(docsDir, "full-launch-governance-vote-opening-execution-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Governance vote opening execution status not generated yet. Run: npm run full-launch:vote-opening-execution:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/full-launch-governance-resolution") {
      const filePath = path.join(docsDir, "full-launch-governance-resolution.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Governance resolution page not generated yet. Run: npm run full-launch:resolution:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/full-launch-governance-resolution") {
      const filePath = path.join(docsDir, "full-launch-governance-resolution-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Governance resolution status not generated yet. Run: npm run full-launch:resolution:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/full-launch-governance-resolution-authorization") {
      const filePath = path.join(docsDir, "full-launch-governance-resolution-authorization.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Governance resolution authorization page not generated yet. Run: npm run full-launch:resolution-authorization:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/full-launch-governance-resolution-authorization") {
      const filePath = path.join(docsDir, "full-launch-governance-resolution-authorization-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Governance resolution authorization status not generated yet. Run: npm run full-launch:resolution-authorization:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/full-launch-governance-decision-recording") {
      const filePath = path.join(docsDir, "full-launch-governance-decision-recording.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Governance decision recording page not generated yet. Run: npm run full-launch:decision-recording:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/full-launch-governance-decision-recording") {
      const filePath = path.join(docsDir, "full-launch-governance-decision-recording-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Governance decision recording status not generated yet. Run: npm run full-launch:decision-recording:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/full-launch-governance-decision-recording-authorization") {
      const filePath = path.join(docsDir, "full-launch-governance-decision-recording-authorization.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Governance decision authorization page not generated yet. Run: npm run full-launch:decision-authorization:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/full-launch-governance-decision-recording-authorization") {
      const filePath = path.join(docsDir, "full-launch-governance-decision-recording-authorization-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Governance decision authorization status not generated yet. Run: npm run full-launch:decision-authorization:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/launch-control") {
      const filePath = path.join(docsDir, "launch-control.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Launch Control page not generated yet. Run: npm run launch:control:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/launch-control") {
      const filePath = path.join(docsDir, "launch-control-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Launch Control status not generated yet. Run: npm run launch:control:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/governance-decision-approval") {
      const filePath = path.join(docsDir, "governance-decision-approval.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Governance decision approval page not generated yet. Run: npm run action:governance-decision:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/governance-decision-approval") {
      const filePath = path.join(docsDir, "governance-decision-approval-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Governance decision approval status not generated yet. Run: npm run action:governance-decision:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/capability-matrix") {
      const filePath = path.join(docsDir, "capability-matrix.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Capability Matrix page not generated yet. Run: npm run capability:matrix:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/capability-matrix") {
      const filePath = path.join(docsDir, "capability-matrix-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Capability Matrix status not generated yet. Run: npm run capability:matrix:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/public-status-update") {
      const filePath = path.join(docsDir, "public-status-update.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Public Status Update page not generated yet. Run: npm run public-status:update:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/public-status-update") {
      const filePath = path.join(docsDir, "public-status-update-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Public Status Update status not generated yet. Run: npm run public-status:update:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/governance-vote-result-evidence") {
      const filePath = path.join(docsDir, "governance-vote-result-evidence.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Governance vote/result evidence page not generated yet. Run: npm run governance:vote-result-evidence:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/governance-vote-result-evidence") {
      const filePath = path.join(docsDir, "governance-vote-result-evidence-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Governance vote/result evidence status not generated yet. Run: npm run governance:vote-result-evidence:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/signed-governance-resolution-evidence") {
      const filePath = path.join(docsDir, "signed-governance-resolution-evidence.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Signed governance resolution evidence page not generated yet. Run: npm run governance:signed-resolution-evidence:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/signed-governance-resolution-evidence") {
      const filePath = path.join(docsDir, "signed-governance-resolution-evidence-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Signed governance resolution evidence status not generated yet. Run: npm run governance:signed-resolution-evidence:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/governance-decision-live-precheck") {
      const filePath = path.join(docsDir, "governance-decision-live-precheck.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Governance decision live precheck page not generated yet. Run: npm run governance:decision-live-precheck:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/governance-decision-live-precheck") {
      const filePath = path.join(docsDir, "governance-decision-live-precheck-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Governance decision live precheck status not generated yet. Run: npm run governance:decision-live-precheck:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/governance-decision") {
      const filePath = path.join(docsDir, "governance-decision.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Governance decision page not generated yet. Run: npm run governance:decision-recording-live:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/governance-decision") {
      const filePath = path.join(docsDir, "governance-decision-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Governance decision status not generated yet. Run: npm run governance:decision-recording-live:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/restricted-mode-final-status") {
      const filePath = path.join(docsDir, "restricted-mode-final-status.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Restricted-mode final status page not generated yet. Run: npm run restricted-mode:final-status:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/restricted-mode-final-status") {
      const filePath = path.join(docsDir, "restricted-mode-final-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Restricted-mode final status not generated yet. Run: npm run restricted-mode:final-status:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/restricted-mode-monitoring-baseline") {
      const filePath = path.join(docsDir, "restricted-mode-monitoring-baseline.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Restricted-mode monitoring baseline page not generated yet. Run: npm run restricted-mode:monitoring-baseline:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/restricted-mode-monitoring-baseline") {
      const filePath = path.join(docsDir, "restricted-mode-monitoring-baseline-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Restricted-mode monitoring baseline not generated yet. Run: npm run restricted-mode:monitoring-baseline:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/restricted-mode-evidence-seal") {
      const filePath = path.join(docsDir, "restricted-mode-evidence-seal.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Restricted-mode evidence seal page not generated yet. Run: npm run restricted-mode:evidence-seal:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/restricted-mode-evidence-seal") {
      const filePath = path.join(docsDir, "restricted-mode-evidence-seal-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Restricted-mode evidence seal not generated yet. Run: npm run restricted-mode:evidence-seal:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/restricted-mode-release-candidate") {
      const filePath = path.join(docsDir, "restricted-mode-release-candidate.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Restricted-mode release candidate page not generated yet. Run: npm run restricted-mode:release-candidate:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/restricted-mode-release-candidate") {
      const filePath = path.join(docsDir, "restricted-mode-release-candidate-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Restricted-mode release candidate not generated yet. Run: npm run restricted-mode:release-candidate:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/restricted-mode-final-release") {
      const filePath = path.join(docsDir, "restricted-mode-final-release.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Restricted-mode final release page not generated yet. Run: npm run restricted-mode:final-release:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/restricted-mode-final-release") {
      const filePath = path.join(docsDir, "restricted-mode-final-release-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Restricted-mode final release not generated yet. Run: npm run restricted-mode:final-release:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/restricted-mode-operations-handoff") {
      const filePath = path.join(docsDir, "restricted-mode-operations-handoff.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Restricted-mode operations handoff page not generated yet. Run: npm run restricted-mode:operations-handoff:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/restricted-mode-operations-handoff") {
      const filePath = path.join(docsDir, "restricted-mode-operations-handoff-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Restricted-mode operations handoff not generated yet. Run: npm run restricted-mode:operations-handoff:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/restricted-mode-maintenance-schedule") {
      const filePath = path.join(docsDir, "restricted-mode-maintenance-schedule.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Restricted-mode maintenance schedule page not generated yet. Run: npm run restricted-mode:maintenance-schedule:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/restricted-mode-maintenance-schedule") {
      const filePath = path.join(docsDir, "restricted-mode-maintenance-schedule-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Restricted-mode maintenance schedule not generated yet. Run: npm run restricted-mode:maintenance-schedule:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/restricted-mode-operator-checklist") {
      const filePath = path.join(docsDir, "restricted-mode-operator-checklist.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Restricted-mode operator checklist page not generated yet. Run: npm run restricted-mode:operator-checklist:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/restricted-mode-operator-checklist") {
      const filePath = path.join(docsDir, "restricted-mode-operator-checklist-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Restricted-mode operator checklist not generated yet. Run: npm run restricted-mode:operator-checklist:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/capability-activation-intake") {
      const filePath = path.join(docsDir, "capability-activation-intake.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Capability activation intake page not generated yet. Run: npm run capability:intake:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/capability-activation-intake") {
      const filePath = path.join(docsDir, "capability-activation-intake-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Capability activation intake status not generated yet. Run: npm run capability:intake:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/capability-request-import") {
      const filePath = path.join(docsDir, "capability-request-import.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Capability request import page not generated yet. Run: npm run capability:request-import:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/capability-request-import") {
      const filePath = path.join(docsDir, "capability-request-import-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Capability request import status not generated yet. Run: npm run capability:request-import:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/capability-request-review") {
      const filePath = path.join(docsDir, "capability-request-review.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "Capability request review page not generated yet. Run: npm run capability:request-review:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/capability-request-review") {
      const filePath = path.join(docsDir, "capability-request-review-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "Capability request review status not generated yet. Run: npm run capability:request-review:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-liquidity-path") {
      const filePath = path.join(docsDir, "dex-liquidity-path.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX/liquidity path page not generated yet. Run: npm run dex:liquidity-path:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-liquidity-path") {
      const filePath = path.join(docsDir, "dex-liquidity-path-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX/liquidity path status not generated yet. Run: npm run dex:liquidity-path:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-liquidity-parameters") {
      const filePath = path.join(docsDir, "dex-liquidity-parameters.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX liquidity parameters page not generated yet. Run: npm run dex:liquidity-parameters:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-liquidity-parameters") {
      const filePath = path.join(docsDir, "dex-liquidity-parameters-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX liquidity parameters status not generated yet. Run: npm run dex:liquidity-parameters:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-liquidity-parameter-selection") {
      const filePath = path.join(docsDir, "dex-liquidity-parameter-selection.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX liquidity parameter selection page not generated yet. Run: npm run dex:liquidity-selection:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-liquidity-parameter-selection") {
      const filePath = path.join(docsDir, "dex-liquidity-parameter-selection-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX liquidity parameter selection status not generated yet. Run: npm run dex:liquidity-selection:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-liquidity-parameter-finalization") {
      const filePath = path.join(docsDir, "dex-liquidity-parameter-finalization.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX liquidity parameter finalization review page not generated yet. Run: npm run dex:liquidity-finalization:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-liquidity-parameter-finalization") {
      const filePath = path.join(docsDir, "dex-liquidity-parameter-finalization-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX liquidity parameter finalization status not generated yet. Run: npm run dex:liquidity-finalization:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-liquidity-parameter-approval") {
      const filePath = path.join(docsDir, "dex-liquidity-parameter-approval.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX liquidity parameter approval page not generated yet. Run: npm run dex:liquidity-parameter-approval:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-liquidity-parameter-approval") {
      const filePath = path.join(docsDir, "dex-liquidity-parameter-approval-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX liquidity parameter approval status not generated yet. Run: npm run dex:liquidity-parameter-approval:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-liquidity-source-safe-impact") {
      const filePath = path.join(docsDir, "dex-liquidity-source-safe-impact.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX liquidity source/Safe impact page not generated yet. Run: npm run dex:liquidity-source-safe:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-liquidity-source-safe-impact") {
      const filePath = path.join(docsDir, "dex-liquidity-source-safe-impact-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX liquidity source/Safe impact status not generated yet. Run: npm run dex:liquidity-source-safe:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-readiness") {
      const filePath = path.join(docsDir, "dex-pool-creation-readiness.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX pool creation readiness page not generated yet. Run: npm run dex:pool-creation-readiness:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-readiness") {
      const filePath = path.join(docsDir, "dex-pool-creation-readiness-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX pool creation readiness status not generated yet. Run: npm run dex:pool-creation-readiness:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-existence-precheck") {
      const filePath = path.join(docsDir, "dex-pool-existence-precheck.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX pool existence precheck page not generated yet. Run: npm run dex:pool-existence-precheck:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-existence-precheck") {
      const filePath = path.join(docsDir, "dex-pool-existence-precheck-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX pool existence precheck status not generated yet. Run: npm run dex:pool-existence-precheck:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-approval") {
      const filePath = path.join(docsDir, "dex-pool-creation-approval.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX pool creation approval page not generated yet. Run: npm run dex:pool-creation-approval:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-approval") {
      const filePath = path.join(docsDir, "dex-pool-creation-approval-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX pool creation approval status not generated yet. Run: npm run dex:pool-creation-approval:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-execution-precheck") {
      const filePath = path.join(docsDir, "dex-pool-creation-execution-precheck.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX pool creation execution precheck page not generated yet. Run: npm run dex:pool-creation-execution-precheck:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-execution-precheck") {
      const filePath = path.join(docsDir, "dex-pool-creation-execution-precheck-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX pool creation execution precheck status not generated yet. Run: npm run dex:pool-creation-execution-precheck:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-safe-payload-preparation") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-payload-preparation.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX pool creation Safe payload preparation page not generated yet. Run: npm run dex:pool-creation-safe-payload-preparation:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-safe-payload-preparation") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-payload-preparation-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX pool creation Safe payload preparation status not generated yet. Run: npm run dex:pool-creation-safe-payload-preparation:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-safe-payload-draft") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-payload-draft.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX pool creation Safe payload draft page not generated yet. Run: npm run dex:pool-creation-safe-payload-draft:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-safe-payload-draft") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-payload-draft-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX pool creation Safe payload draft status not generated yet. Run: npm run dex:pool-creation-safe-payload-draft:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-safe-payload-draft-review") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-payload-draft-review.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX pool creation Safe payload draft review page not generated yet. Run: npm run dex:pool-creation-safe-payload-draft-review:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-safe-payload-draft-review") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-payload-draft-review-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX pool creation Safe payload draft review status not generated yet. Run: npm run dex:pool-creation-safe-payload-draft-review:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-token-ordering-sqrtprice") {
      const filePath = path.join(docsDir, "dex-pool-creation-token-ordering-sqrtprice.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX token ordering and sqrtPriceX96 review page not generated yet. Run: npm run dex:pool-creation-sqrtprice:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-token-ordering-sqrtprice") {
      const filePath = path.join(docsDir, "dex-pool-creation-token-ordering-sqrtprice-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX token ordering and sqrtPriceX96 review status not generated yet. Run: npm run dex:pool-creation-sqrtprice:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-factory-router-review") {
      const filePath = path.join(docsDir, "dex-pool-creation-factory-router-review.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX factory/router execution path review page not generated yet. Run: npm run dex:pool-creation-factory-router:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-factory-router-review") {
      const filePath = path.join(docsDir, "dex-pool-creation-factory-router-review-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX factory/router execution path review status not generated yet. Run: npm run dex:pool-creation-factory-router:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-safe-owners-threshold") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-owners-threshold.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX Safe owners and threshold review page not generated yet. Run: npm run dex:pool-creation-safe-owners:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-safe-owners-threshold") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-owners-threshold-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX Safe owners and threshold review status not generated yet. Run: npm run dex:pool-creation-safe-owners:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-safe-payload-generation-approval") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-payload-generation-approval.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX Safe payload generation approval page not generated yet. Run: npm run dex:pool-creation-safe-payload-generation-approval:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-safe-payload-generation-approval") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-payload-generation-approval-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX Safe payload generation approval status not generated yet. Run: npm run dex:pool-creation-safe-payload-generation-approval:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-safe-payload-generation") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-payload-generation.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX Safe payload generation page not generated yet. Run: npm run dex:pool-creation-safe-payload-generation:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-safe-payload-generation") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-payload-generation-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX Safe payload generation status not generated yet. Run: npm run dex:pool-creation-safe-payload-generation:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-safe-payload-verification") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-payload-verification.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX Safe payload verification page not generated yet. Run: npm run dex:pool-creation-safe-payload-verification:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-safe-payload-verification") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-payload-verification-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX Safe payload verification status not generated yet. Run: npm run dex:pool-creation-safe-payload-verification:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-safe-submission-approval") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-submission-approval.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX Safe submission approval page not generated yet. Run: npm run dex:pool-creation-safe-submission-approval:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-safe-submission-approval") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-submission-approval-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX Safe submission approval status not generated yet. Run: npm run dex:pool-creation-safe-submission-approval:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-safe-submission-preparation") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-submission-preparation.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX Safe submission preparation page not generated yet. Run: npm run dex:pool-creation-safe-submission-preparation:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-safe-submission-preparation") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-submission-preparation-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX Safe submission preparation status not generated yet. Run: npm run dex:pool-creation-safe-submission-preparation:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-safe-submission-dry-run") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-submission-dry-run.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX Safe submission dry run page not generated yet. Run: npm run dex:pool-creation-safe-submission-dry-run:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-safe-submission-dry-run") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-submission-dry-run-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX Safe submission dry run status not generated yet. Run: npm run dex:pool-creation-safe-submission-dry-run:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-safe-submission-execution-approval") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-submission-execution-approval.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX Safe submission execution approval page not generated yet. Run: npm run dex:pool-creation-safe-submission-execution-approval:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-safe-submission-execution-approval") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-submission-execution-approval-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX Safe submission execution approval status not generated yet. Run: npm run dex:pool-creation-safe-submission-execution-approval:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-safe-submission-live") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-submission-live.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX Safe submission live page not generated yet. Run: npm run dex:pool-creation-safe-submission-live:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-safe-submission-live") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-submission-live-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX Safe submission live status not generated yet. Run: npm run dex:pool-creation-safe-submission-live:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-safe-execution-approval") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-execution-approval.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX Safe execution approval page not generated yet. Run: npm run dex:pool-creation-safe-execution-approval:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-safe-execution-approval") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-execution-approval-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX Safe execution approval status not generated yet. Run: npm run dex:pool-creation-safe-execution-approval:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-safe-execution-live") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-execution-live.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX Safe execution live page not generated yet. Run: npm run dex:pool-creation-safe-execution-live:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-safe-execution-live") {
      const filePath = path.join(docsDir, "dex-pool-creation-safe-execution-live-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX Safe execution live status not generated yet. Run: npm run dex:pool-creation-safe-execution-live:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-pool-creation-post-execution-verification") {
      const filePath = path.join(docsDir, "dex-pool-creation-post-execution-verification.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX post-execution pool verification page not generated yet. Run: npm run dex:pool-creation-post-execution:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-pool-creation-post-execution-verification") {
      const filePath = path.join(docsDir, "dex-pool-creation-post-execution-verification-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX post-execution pool verification status not generated yet. Run: npm run dex:pool-creation-post-execution:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-liquidity-provision-approval") {
      const filePath = path.join(docsDir, "dex-liquidity-provision-approval.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX liquidity provision approval page not generated yet. Run: npm run dex:liquidity-provision-approval:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-liquidity-provision-approval") {
      const filePath = path.join(docsDir, "dex-liquidity-provision-approval-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX liquidity provision approval status not generated yet. Run: npm run dex:liquidity-provision-approval:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-liquidity-token-approval-requirements") {
      const filePath = path.join(docsDir, "dex-liquidity-token-approval-requirements.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX liquidity token approval requirements page not generated yet. Run: npm run dex:liquidity-token-approval:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-liquidity-token-approval-requirements") {
      const filePath = path.join(docsDir, "dex-liquidity-token-approval-requirements-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX liquidity token approval requirements status not generated yet. Run: npm run dex:liquidity-token-approval:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-liquidity-mint-parameter-review") {
      const filePath = path.join(docsDir, "dex-liquidity-mint-parameter-review.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX liquidity mint parameter review page not generated yet. Run: npm run dex:liquidity-mint-params:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-liquidity-mint-parameter-review") {
      const filePath = path.join(docsDir, "dex-liquidity-mint-parameter-review-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX liquidity mint parameter review status not generated yet. Run: npm run dex:liquidity-mint-params:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-liquidity-treasury-funding-approval") {
      const filePath = path.join(docsDir, "dex-liquidity-treasury-funding-approval.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX liquidity treasury funding approval page not generated yet. Run: npm run dex:liquidity-treasury-funding-approval:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-liquidity-treasury-funding-approval") {
      const filePath = path.join(docsDir, "dex-liquidity-treasury-funding-approval-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX liquidity treasury funding approval status not generated yet. Run: npm run dex:liquidity-treasury-funding-approval:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-liquidity-funding-transfer-requirements") {
      const filePath = path.join(docsDir, "dex-liquidity-funding-transfer-requirements.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX liquidity funding transfer requirements page not generated yet. Run: npm run dex:liquidity-funding-transfer-requirements:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-liquidity-funding-transfer-requirements") {
      const filePath = path.join(docsDir, "dex-liquidity-funding-transfer-requirements-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX liquidity funding transfer requirements status not generated yet. Run: npm run dex:liquidity-funding-transfer-requirements:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-liquidity-funding-transfer-approval") {
      const filePath = path.join(docsDir, "dex-liquidity-funding-transfer-approval.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX liquidity funding transfer approval page not generated yet. Run: npm run dex:liquidity-funding-transfer-approval:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-liquidity-funding-transfer-approval") {
      const filePath = path.join(docsDir, "dex-liquidity-funding-transfer-approval-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX liquidity funding transfer approval status not generated yet. Run: npm run dex:liquidity-funding-transfer-approval:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-liquidity-funding-transfer-payload-generation-approval") {
      const filePath = path.join(docsDir, "dex-liquidity-funding-transfer-payload-generation-approval.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX liquidity funding transfer payload generation approval page not generated yet. Run: npm run dex:liquidity-funding-transfer-payload-generation-approval:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-liquidity-funding-transfer-payload-generation-approval") {
      const filePath = path.join(docsDir, "dex-liquidity-funding-transfer-payload-generation-approval-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX liquidity funding transfer payload generation approval status not generated yet. Run: npm run dex:liquidity-funding-transfer-payload-generation-approval:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-liquidity-funding-transfer-safe-payload-verification") {
      const filePath = path.join(docsDir, "dex-liquidity-funding-transfer-safe-payload-verification.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX liquidity funding transfer Safe payload verification page not generated yet. Run: npm run dex:liquidity-funding-transfer-payload-verification:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-liquidity-funding-transfer-safe-payload-verification") {
      const filePath = path.join(docsDir, "dex-liquidity-funding-transfer-safe-payload-verification-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX liquidity funding transfer Safe payload verification status not generated yet. Run: npm run dex:liquidity-funding-transfer-payload-verification:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/dex-liquidity-funding-transfer-safe-submission-approval") {
      const filePath = path.join(docsDir, "dex-liquidity-funding-transfer-safe-submission-approval.html");

      if (!fs.existsSync(filePath)) {
        textResponse(res, "DEX liquidity funding transfer Safe submission approval page not generated yet. Run: npm run dex:liquidity-funding-transfer-safe-submission-approval:status\n", 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/public/dex-liquidity-funding-transfer-safe-submission-approval") {
      const filePath = path.join(docsDir, "dex-liquidity-funding-transfer-safe-submission-approval-status.json");

      if (!fs.existsSync(filePath)) {
        jsonResponse(res, { error: "DEX liquidity funding transfer Safe submission approval status not generated yet. Run: npm run dex:liquidity-funding-transfer-safe-submission-approval:status" }, 404);
        return;
      }

      textResponse(res, readText(filePath), 200, "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/healthz") {
      jsonResponse(res, {
        ok: true,
        app: "astra-public-site",
        generatedAt: new Date().toISOString()
      });
      return;
    }

    if (url.pathname === "/api/public/status") {
      jsonResponse(res, getPublicStatus());
      return;
    }

    if (url.pathname === "/api/public/contracts") {
      jsonResponse(res, {
        generatedAt: new Date().toISOString(),
        network: "Base Sepolia",
        chainId: 84532,
        contracts: getContractRows()
      });
      return;
    }

    if (url.pathname === "/api/public/verification") {
      jsonResponse(res, getVerificationSummary());
      return;
    }

    if (url.pathname.startsWith("/docs/")) {
      const requestedName = decodeURIComponent(url.pathname.replace("/docs/", ""));
      serveDoc(res, requestedName);
      return;
    }

    if (url.pathname === "/favicon.ico") {
      res.writeHead(204);
      res.end();
      return;
    }

    textResponse(res, "Not found\n", 404);
  } catch (error) {
    jsonResponse(res, {
      error: error.message,
      stack: error.stack
    }, 500);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`AstraTreasury public site running at http://${HOST}:${PORT}`);
  console.log("This is a sanitized read-only public site. Operator dashboard remains separate.");
});
