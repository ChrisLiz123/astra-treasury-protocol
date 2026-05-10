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
        <li><a href="/audit">Audit readiness</a></li>
      </ul>
    </section>

    <section class="card">
      <h2>Public API</h2>
      <ul>
        <li><a href="/api/public/status">/api/public/status</a></li>
        <li><a href="/api/public/contracts">/api/public/contracts</a></li>
        <li><a href="/api/public/verification">/api/public/verification</a></li>
        <li><a href="/api/public/audit">/api/public/audit</a></li>
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
