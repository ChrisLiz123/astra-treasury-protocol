import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(".");
const outDir = path.join(projectRoot, "public-docs");
const verificationDir = path.join(projectRoot, "reports", "verification");

fs.mkdirSync(outDir, { recursive: true });

loadEnvFile(path.join(projectRoot, "deployments", "base-sepolia.env"));

const dashboardUrl = process.env.PUBLIC_DOCS_DASHBOARD_URL || "http://127.0.0.1:8787";

const contracts = [
  ["AstraToken", "ASTRA_TOKEN", "ERC-20 fixed supply token"],
  ["TreasuryPolicy", "ASTRA_POLICY", "Rulebook for treasury actions"],
  ["TreasuryVault", "ASTRA_VAULT", "Custody layer for protocol assets"],
  ["SignalRegistry", "ASTRA_SIGNAL_REGISTRY", "On-chain AI signal log"],
  ["ExecutionController", "ASTRA_CONTROLLER", "Policy-gated execution controller"]
];

const apiSnapshot = {
  generatedAt: new Date().toISOString(),
  status: await fetchJson("/api/status"),
  health: await fetchJson("/api/health"),
  paper: await fetchJson("/api/paper/status"),
  signalApprovalQueue: await fetchJson("/api/paper/approval-queue"),
  executionQueue: await fetchJson("/api/execution-queue"),
  actionHistory: await fetchJson("/api/action-history"),
  signalHistory: await fetchJson("/api/signal-history")
};

fs.writeFileSync(
  path.join(outDir, "status-snapshot.json"),
  JSON.stringify(apiSnapshot, null, 2) + "\n"
);

const readme = `# AstraTreasury Protocol

AstraTreasury Protocol is a Base Sepolia testnet MVP for an AI-assisted treasury workflow.

## Current status

This deployment is a testnet prototype. It is not a public token sale, not an investment product, and not a promise of returns.

## Core safety model

\`\`\`text
AI paper signal
→ local paper-trading dashboard
→ manual signal approval queue
→ SignalRegistry on Base Sepolia
→ policy-aware execution queue
→ manual execution approval
→ ExecutionController
→ TreasuryVault
\`\`\`

The dashboard and APIs are read-only. Private keys are not used by the dashboard.

## Public documents

- [Contracts](./contracts.md)
- [Safety workflow](./safety-workflow.md)
- [Dashboard/API](./dashboard-api.md)
- [Verification](./verification.md)
- [Status snapshot](./status-snapshot.json)
`;

fs.writeFileSync(path.join(outDir, "README.md"), readme);

const contractsMd = [
  "# Contracts",
  "",
  "Network: Base Sepolia",
  "",
  "Chain ID: `84532`",
  "",
  "| Contract | Address | Purpose | BaseScan |",
  "|---|---|---|---|",
  ...contracts.map(([name, envName, purpose]) => {
    const addr = process.env[envName] || "";
    return `| ${name} | \`${addr}\` | ${purpose} | https://sepolia.basescan.org/address/${addr} |`;
  }),
  "",
  "## Token",
  "",
  "Token name: `AstraTreasury Token`",
  "",
  "Symbol: `ASTP`",
  "",
  "Supply model: fixed supply",
  "",
  "Total supply: `1,000,000,000 ASTP`",
  "",
  "## Important note",
  "",
  "This is a testnet deployment. Testnet ASTP has no real monetary value."
].join("\n");

fs.writeFileSync(path.join(outDir, "contracts.md"), contractsMd + "\n");

const workflowMd = `# Safety Workflow

AstraTreasury uses two separate human approval layers.

## Layer 1: Signal approval

\`\`\`text
Paper-trading signal
→ NEW
→ APPROVED or REJECTED
→ submitted to SignalRegistry only after manual approval
\`\`\`

## Layer 2: Execution approval

\`\`\`text
On-chain signal
→ execution proposal
→ live TreasuryPolicy check
→ POLICY_PASSED or POLICY_BLOCKED
→ APPROVED_FOR_EXECUTION or REJECTED
→ guarded execution command
\`\`\`

## Guardrails

- Dashboard is read-only.
- Paper loop does not use private keys.
- AI signals are not orders.
- Signal submission does not move funds.
- Treasury execution requires a separate queue approval.
- Execution is checked against the live TreasuryPolicy contract before transaction submission.
- Current execution test amount is intentionally tiny on Base Sepolia.
`;

fs.writeFileSync(path.join(outDir, "safety-workflow.md"), workflowMd);

const dashboardMd = `# Dashboard and API

The dashboard runs locally on the server and is usually accessed through an SSH tunnel.

## Pages

\`\`\`text
/
 /paper
 /queue
 /execution-queue
 /signals
 /history
 /public-docs
\`\`\`

## API endpoints

\`\`\`text
/api/status
/api/health
/api/treasury
/api/policy
/api/signal
/api/signal-history
/api/recent-execution
/api/action-history
/api/paper/status
/api/paper/approval-queue
/api/execution-queue
\`\`\`

## Local access

\`\`\`bash
ssh -L 8787:127.0.0.1:8787 root@YOUR_SERVER_IP
\`\`\`

Then open:

\`\`\`text
http://127.0.0.1:8787
\`\`\`
`;

fs.writeFileSync(path.join(outDir, "dashboard-api.md"), dashboardMd);

const verificationSummaryPath = path.join(verificationDir, "base-sepolia-contracts.json");
const verificationSummary = fs.existsSync(verificationSummaryPath)
  ? JSON.parse(fs.readFileSync(verificationSummaryPath, "utf8"))
  : null;

const verificationMd = [
  "# Contract Verification",
  "",
  "Verification assets are generated in:",
  "",
  "```text",
  "reports/verification/",
  "```",
  "",
  "Important files:",
  "",
  "```text",
  "reports/verification/standard-json-input.json",
  "reports/verification/base-sepolia-contracts.json",
  "reports/verification/base-sepolia-verify-commands.sh",
  "reports/verification/manual-basescan-verification.md",
  "reports/verification/constructor-args-no-0x/",
  "```",
  "",
  "Automated verification:",
  "",
  "```bash",
  "bash reports/verification/base-sepolia-verify-commands.sh",
  "```",
  "",
  "Manual verification:",
  "",
  "```text",
  "https://sepolia.basescan.org/verifyContract",
  "```",
  "",
  verificationSummary
    ? `Compiler: \`${verificationSummary.compilerVersion}\`\n\nOptimizer: enabled, runs 200\n\nEVM version: cancun`
    : "Verification summary has not been generated yet."
].join("\n");

fs.writeFileSync(path.join(outDir, "verification.md"), verificationMd + "\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>AstraTreasury Public Docs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root { color-scheme: dark; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #0d1117; color: #e6edf3; }
    header { padding: 28px 32px; background: #010409; border-bottom: 1px solid #30363d; }
    main { padding: 24px 32px 48px; display: grid; gap: 18px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 14px; padding: 18px; }
    a { color: #58a6ff; }
    code { background: #0d1117; padding: 2px 5px; border-radius: 5px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #30363d; padding: 10px; text-align: left; vertical-align: top; }
    .muted { color: #8b949e; }
  </style>
</head>
<body>
<header>
  <h1>AstraTreasury Protocol Public Docs</h1>
  <div class="muted">Base Sepolia testnet documentation and safety workflow.</div>
</header>
<main>
  <section class="card">
    <h2>Documents</h2>
    <ul>
      <li><a href="/public-docs/README.md">README</a></li>
      <li><a href="/public-docs/contracts.md">Contracts</a></li>
      <li><a href="/public-docs/safety-workflow.md">Safety workflow</a></li>
      <li><a href="/public-docs/dashboard-api.md">Dashboard/API</a></li>
      <li><a href="/public-docs/verification.md">Verification</a></li>
      <li><a href="/public-docs/status-snapshot.json">Status snapshot JSON</a></li>
    </ul>
  </section>

  <section class="card">
    <h2>Contracts</h2>
    <table>
      <thead><tr><th>Contract</th><th>Address</th><th>BaseScan</th></tr></thead>
      <tbody>
        ${contracts.map(([name, envName]) => {
          const addr = process.env[envName] || "";
          return `<tr><td>${name}</td><td><code>${addr}</code></td><td><a href="https://sepolia.basescan.org/address/${addr}" target="_blank" rel="noreferrer">Open</a></td></tr>`;
        }).join("\n")}
      </tbody>
    </table>
  </section>

  <section class="card">
    <h2>Safety Summary</h2>
    <p>AI signals are paper-traded first, signal submission requires manual approval, and treasury execution requires a separate policy-aware manual approval.</p>
    <p>This is a Base Sepolia testnet prototype. It is not an investment product and does not promise returns.</p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, "astra-public-overview.html"), html);

console.log("Public docs generated:");
console.log(`- ${path.join(outDir, "README.md")}`);
console.log(`- ${path.join(outDir, "contracts.md")}`);
console.log(`- ${path.join(outDir, "safety-workflow.md")}`);
console.log(`- ${path.join(outDir, "dashboard-api.md")}`);
console.log(`- ${path.join(outDir, "verification.md")}`);
console.log(`- ${path.join(outDir, "astra-public-overview.html")}`);

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

    process.env[key] ||= value;
  }
}

async function fetchJson(endpoint) {
  try {
    const res = await fetch(`${dashboardUrl}${endpoint}`, {
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      return {
        ok: false,
        endpoint,
        status: res.status,
        text: await res.text()
      };
    }

    return {
      ok: true,
      endpoint,
      data: await res.json()
    };
  } catch (error) {
    return {
      ok: false,
      endpoint,
      error: error.message
    };
  }
}
