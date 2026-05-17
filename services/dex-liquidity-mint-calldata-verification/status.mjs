import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const verificationRelativePath = "reports/dex-liquidity-mint-calldata-verification/dex-liquidity-mint-calldata-verification.json";
const calldataRelativePath = "reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json";

const reportDir = path.join(root, "reports", "dex-liquidity-mint-calldata-verification");
const statusReportFile = path.join(reportDir, "dex-liquidity-mint-calldata-verification-status.json");

const publicJsonFile = path.join(root, "public-docs", "dex-liquidity-mint-calldata-verification-status.json");
const publicHtmlFile = path.join(root, "public-docs", "dex-liquidity-mint-calldata-verification.html");

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

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sha256File(relativePath) {
  const full = path.join(root, relativePath);
  const buffer = fs.readFileSync(full);

  return { path: relativePath, bytes: buffer.length, sha256: sha256Buffer(buffer) };
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
  return String(value || "UNKNOWN").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const verification = readJson(verificationRelativePath, null);
const verified = Boolean(verification && verification.schema === "astra-dex-liquidity-mint-calldata-verification-v0.1");

const calldataStatus = readJson("public-docs/dex-liquidity-mint-calldata-status.json");
const approvalStatus = readJson("public-docs/dex-liquidity-mint-calldata-generation-approval-status.json");
const allowanceStatus = readJson("public-docs/dex-liquidity-token-approval-post-execution-allowances-status.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const status = verified
  ? verification.status
  : "DEX_LIQUIDITY_MINT_CALLDATA_VERIFICATION_NOT_RUN";

const artifactPaths = [
  verificationRelativePath,
  calldataRelativePath,
  "public-docs/dex-liquidity-mint-calldata-status.json",
  "reports/dex-liquidity-mint-calldata/dex-liquidity-mint-calldata-generation.json",
  "public-docs/dex-liquidity-mint-calldata-generation-approval-status.json",
  "public-docs/dex-liquidity-token-approval-post-execution-allowances-status.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
].filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)));

const artifactHashes = artifactPaths.map((artifactPath) => sha256File(artifactPath));

const liveChecks = verification?.liveChecks || {};

const tokenRows = [liveChecks.token0, liveChecks.token1].filter(Boolean).map((token) => {
  return `<tr>
    <td>${escapeHtml(token.tokenAddress)}</td>
    <td>${escapeHtml(token.desiredRaw)}</td>
    <td>${escapeHtml(token.minRaw)}</td>
    <td>${escapeHtml(token.liveBalanceRaw)}</td>
    <td>${escapeHtml(token.liveAllowanceRaw)}</td>
    <td>${escapeHtml(token.balanceCoversDesired)}</td>
    <td>${escapeHtml(token.allowanceCoversDesired)}</td>
  </tr>`;
}).join("");

const publicPayload = {
  schema: "astra-dex-liquidity-mint-calldata-verification-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: verified
    ? "AstraTreasury verified the generated DEX liquidity mint calldata. No liquidity Safe payload has been generated, no liquidity transaction has been submitted or executed, liquidity has not been added, public trading is not approved, and full launch is not approved."
    : "AstraTreasury DEX liquidity mint calldata verification has not completed successfully.",
  summary: {
    verified,
    liquidityMintCalldataGenerated: verification?.liquidityMintCalldataGenerated === true,
    liquidityMintCalldataVerified: verification?.liquidityMintCalldataVerified === true,
    liquiditySafeAddress: verification?.liquiditySafeAddress || "",
    nonfungiblePositionManager: verification?.nonfungiblePositionManager || "",
    poolAddress: verification?.poolAddress || "",
    calldataHash: verification?.calldataHash || "",
    calldataHashVerified: verification?.calldataHashVerified === true,
    calldataArtifactHashVerified: verification?.calldataArtifactHashVerified === true,
    decodedMintParamsVerified: verification?.decodedMintParamsVerified === true,
    nftManagerCodePresent: verification?.liveChecks?.nftManagerCodePresent === true,
    poolLiquidityVerifiedZero: verification?.liveChecks?.poolLiquidityVerifiedZero === true,
    liquiditySafePayloadGenerated: false,
    liquiditySafeTransactionSubmitted: false,
    liquiditySafeTransactionExecuted: false,
    liquidityAdded: false,
    positionMinted: false,
    publicTradingApproved: false,
    fullLaunchApproved: false,
    nextRecommendedMilestone: "DEX Liquidity Safe Payload Generation Approval",
    artifactCount: artifactHashes.length
  },
  liquidityMintCalldataVerification: {
    verificationHash: verification?.verificationHash || "",
    hashAlgorithm: "SHA-256",
    mintParams: verification?.mintParams || {},
    freshlyDecodedMintParams: verification?.freshlyDecodedMintParams || {},
    liveChecks,
    requiredBeforeLiquiditySafePayloadGenerationApproval: verification?.requiredBeforeLiquiditySafePayloadGenerationApproval || {},
    artifactHashes
  },
  currentStatuses: {
    dexLiquidityMintCalldata: calldataStatus.status || "UNKNOWN",
    dexLiquidityMintCalldataGenerationApproval: approvalStatus.status || "UNKNOWN",
    dexTokenApprovalPostExecutionAllowances: allowanceStatus.status || "UNKNOWN",
    dexPoolPostExecutionVerification: poolStatus.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
  restrictions: {
    liquiditySafePayloadGeneration: false,
    liquidityProvision: false,
    publicTrading: false,
    buyPageActivation: false,
    globalTreasuryFunding: false,
    fullLaunch: false
  },
  safety: {
    verificationOnly: true,
    generatesLiquiditySafePayload: false,
    submitsLiquiditySafeTransaction: false,
    executesLiquiditySafeTransaction: false,
    addsLiquidity: false,
    mintsPositionOnchain: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

writeJson(statusReportFile, publicPayload);
writeJson(publicJsonFile, publicPayload);

const summaryRows = Object.entries(publicPayload.summary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const mintRows = Object.entries(publicPayload.liquidityMintCalldataVerification.mintParams || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td><code>${escapeHtml(value)}</code></td></tr>`;
}).join("");

const requiredRows = Object.entries(publicPayload.liquidityMintCalldataVerification.requiredBeforeLiquiditySafePayloadGenerationApproval || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete" : "Required / pending"}</td></tr>`;
}).join("");

const statusRows = Object.entries(publicPayload.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury DEX Liquidity Mint Calldata Verification</title>
  <style>
    :root { color-scheme: dark; --bg: #08111f; --surface: #0e1a2b; --border: rgba(148, 163, 184, 0.2); --text: #edf4fb; --muted: #9aaec4; --blue: #67a7ff; --yellow: #f4c35f; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: linear-gradient(180deg, #07101d, var(--bg)); color: var(--text); }
    a { color: var(--blue); text-decoration: none; }
    main { width: min(1120px, calc(100% - 40px)); margin: 0 auto; padding: 44px 0 72px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 28px; box-shadow: 0 22px 70px rgba(0,0,0,.28); margin-bottom: 18px; }
    h1 { margin: 0 0 10px; font-size: 42px; letter-spacing: -1.2px; }
    h2 { margin: 0 0 14px; font-size: 24px; }
    p { color: var(--muted); line-height: 1.65; }
    .badge { display: inline-flex; padding: 8px 12px; border-radius: 999px; background: rgba(244,195,95,.08); border: 1px solid rgba(244,195,95,.22); color: var(--yellow); font-weight: 850; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; border: 1px solid var(--border); border-radius: 18px; overflow: hidden; margin-bottom: 16px; }
    th, td { padding: 14px 16px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }
    th { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; background: rgba(255,255,255,.03); }
    tr:last-child td { border-bottom: 0; }
    code { color: var(--muted); overflow-wrap: anywhere; font-size: 12px; }
    .notice { padding: 16px; border-radius: 16px; background: rgba(244,195,95,.08); border: 1px solid rgba(244,195,95,.22); color: #f7d99a; line-height: 1.6; }
  </style>
</head>
<body>
<main>
  <section class="card">
    <div class="badge">Mint calldata verified · no Safe payload · no liquidity</div>
    <h1>DEX Liquidity Mint Calldata Verification</h1>
    <p>${escapeHtml(publicPayload.publicStatement)}</p>
    <p><strong>Verification hash:</strong> <code>${escapeHtml(publicPayload.liquidityMintCalldataVerification.verificationHash)}</code></p>
  </section>

  <section class="card">
    <h2>Summary</h2>
    <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${summaryRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Verified mint parameters</h2>
    <table><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>${mintRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Live token checks</h2>
    <table>
      <thead><tr><th>Token</th><th>Desired raw</th><th>Min raw</th><th>Live balance</th><th>Live allowance</th><th>Balance covers</th><th>Allowance covers</th></tr></thead>
      <tbody>${tokenRows || '<tr><td colspan="7">No live token checks.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Required before liquidity Safe payload generation approval</h2>
    <table><thead><tr><th>Requirement</th><th>Status</th></tr></thead><tbody>${requiredRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table><thead><tr><th>Area</th><th>Status</th></tr></thead><tbody>${statusRows}</tbody></table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This is verification only. No liquidity Safe payload has been generated, no liquidity transaction has been submitted,
      liquidity has not been added, public trading is not approved, and full launch is not approved.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/dex-liquidity-mint-calldata-verification">/api/public/dex-liquidity-mint-calldata-verification</a></p>
    <p><a href="/dex-liquidity-mint-calldata">DEX Liquidity Mint Calldata</a></p>
    <p><a href="/dex-liquidity-mint-calldata-generation-approval">DEX Liquidity Mint Calldata Generation Approval</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury DEX Liquidity Mint Calldata Verification");
console.log("======================================================");
console.log(`Status: ${publicPayload.status}`);
console.log(`Calldata verified: ${publicPayload.summary.liquidityMintCalldataVerified}`);
console.log(`Calldata hash verified: ${publicPayload.summary.calldataHashVerified}`);
console.log(`Liquidity Safe payload generated: ${publicPayload.summary.liquiditySafePayloadGenerated}`);
console.log(`Liquidity added: ${publicPayload.summary.liquidityAdded}`);
console.log(`Report: ${statusReportFile}`);
