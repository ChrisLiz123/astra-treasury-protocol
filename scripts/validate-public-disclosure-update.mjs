import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "public-disclosure-update.config.json");

const requiredFiles = [
  "docs/disclosures/PUBLIC_DISCLOSURE_UPDATE.md",
  "docs/disclosures/CURRENT_PUBLIC_DISCLOSURE_STATEMENT.md",
  "docs/disclosures/REQUIRED_DISCLOSURES_CHECKLIST.md",
  "docs/disclosures/PROHIBITED_PUBLIC_CLAIMS.md",
  "docs/disclosures/RISK_DISCLOSURE_DRAFT.md",
  "docs/disclosures/WEBSITE_COPY_REVIEW_CHECKLIST.md",
  "docs/disclosures/TOKEN_AND_MARKET_DISCLOSURE.md",
  "docs/disclosures/FULL_LAUNCH_DISCLOSURE_BLOCKERS.md",
  "public-docs/full-launch-status.json",
  "public-docs/legal-full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/execution-dry-run-status.json",
  "public-docs/restricted-operations-status.json",
  "public-docs/mainnet-execution-status.json",
  "public-docs/token-status.json",
  "public-docs/market-status.json"
];

const publishablePublicFiles = [
  "public-docs/index.html",
  "public-docs/trust.html",
  "public-docs/protocol.html",
  "public-docs/security.html",
  "public-docs/faq.html",
  "public-docs/token.html",
  "public-docs/wallet.html",
  "public-docs/market.html",
  "public-docs/full-launch.html",
  "public-docs/legal-full-launch.html",
  "public-docs/treasury-funding.html",
  "public-docs/execution-dry-run.html"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

if (!fs.existsSync(configPath)) {
  issue("configs/public-disclosure-update.config.json", "Missing public disclosure update config.");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required disclosure file.");
  }
}

let config = null;

if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  if (config.network?.chainId !== 8453) {
    issue("network.chainId", "Expected Base Mainnet chain ID 8453.");
  }

  if (config.publicDisclosuresApproved !== false) {
    issue("publicDisclosuresApproved", "Public disclosures must remain not-final-approved until reviewed.");
  }

  if (config.fullLaunchApproved !== false) {
    issue("fullLaunchApproved", "Full launch must remain false.");
  }

  for (const [key, value] of Object.entries(config.capabilityApprovals || {})) {
    if (value !== false) {
      issue(`capabilityApprovals.${key}`, "Capability approval must remain false.");
    }
  }
}

const prohibitedClaims = config?.prohibitedClaims || [];

for (const file of publishablePublicFiles) {
  const fullPath = path.join(root, file);

  if (!fs.existsSync(fullPath)) continue;

  const text = fs.readFileSync(fullPath, "utf8").toLowerCase();

  for (const phrase of prohibitedClaims) {
    const normalized = String(phrase).toLowerCase();

    if (text.includes(normalized)) {
      issue(file, `Publishable public page contains prohibited phrase: ${phrase}`);
    }
  }
}

const executionPath = path.join(root, "public-docs", "mainnet-execution-status.json");
if (fs.existsSync(executionPath)) {
  const execution = JSON.parse(fs.readFileSync(executionPath, "utf8"));

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("mainnet-execution.mode", "Mainnet execution queue must remain disabled.");
  }
}

const treasuryPath = path.join(root, "public-docs", "treasury-funding-status.json");
if (fs.existsSync(treasuryPath)) {
  const treasury = JSON.parse(fs.readFileSync(treasuryPath, "utf8"));

  if (treasury.treasuryFundingApproved !== false) {
    issue("treasuryFundingApproved", "Treasury funding must remain not approved.");
  }
}

const fullLaunchPath = path.join(root, "public-docs", "full-launch-status.json");
if (fs.existsSync(fullLaunchPath)) {
  const fullLaunch = JSON.parse(fs.readFileSync(fullLaunchPath, "utf8"));

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunchApproved", "Full launch must remain not approved.");
  }
}

const result = {
  schema: "astra-public-disclosure-update-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
