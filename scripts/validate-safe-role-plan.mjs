import fs from "node:fs";
import path from "node:path";

const file = process.argv[2] || "configs/mainnet-safe-role-plan.template.json";
const fullPath = path.resolve(file);

const plan = JSON.parse(fs.readFileSync(fullPath, "utf8"));

const errors = [];
const warnings = [];

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function isPlaceholderAddress(value) {
  return /^0x0{35,39}[1-9a-fA-F][0-9a-fA-F]*$/.test(value || "");
}

function check(condition, message) {
  if (!condition) errors.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

check(plan.schema === "astra-safe-role-plan-v0.1", "Invalid schema.");
check(plan.network?.chainId === 8453, "Expected Base Mainnet chainId 8453.");
check(plan.safes && typeof plan.safes === "object", "Missing safes object.");
check(plan.rolePlan && typeof plan.rolePlan === "object", "Missing rolePlan object.");

const allSafeAddresses = new Map();

for (const [safeName, safe] of Object.entries(plan.safes || {})) {
  check(isAddress(safe.address), `${safeName}.address is not a valid address.`);
  warn(!isPlaceholderAddress(safe.address), `${safeName}.address appears to be a placeholder.`);

  check(Number.isInteger(safe.threshold), `${safeName}.threshold must be an integer.`);
  check(Array.isArray(safe.owners), `${safeName}.owners must be an array.`);
  check(safe.owners.length >= 2, `${safeName} should have at least two owners.`);
  check(safe.threshold >= 2, `${safeName}.threshold should be at least 2.`);
  check(safe.threshold <= safe.owners.length, `${safeName}.threshold cannot exceed owner count.`);

  const ownerSet = new Set();

  for (const owner of safe.owners || []) {
    check(isAddress(owner), `${safeName} owner is not a valid address: ${owner}`);
    warn(!isPlaceholderAddress(owner), `${safeName} owner appears to be a placeholder: ${owner}`);
    check(!ownerSet.has(String(owner).toLowerCase()), `${safeName} has duplicate owner: ${owner}`);
    ownerSet.add(String(owner).toLowerCase());
  }

  const safeKey = String(safe.address).toLowerCase();

  if (allSafeAddresses.has(safeKey)) {
    errors.push(`${safeName}.address duplicates ${allSafeAddresses.get(safeKey)}.`);
  } else {
    allSafeAddresses.set(safeKey, safeName);
  }
}

const requiredRoles = [
  "TreasuryPolicy.DEFAULT_ADMIN_ROLE",
  "TreasuryVault.DEFAULT_ADMIN_ROLE",
  "TreasuryVault.EXECUTOR_ROLE",
  "SignalRegistry.DEFAULT_ADMIN_ROLE",
  "SignalRegistry.SIGNALER_ROLE",
  "ExecutionController.DEFAULT_ADMIN_ROLE",
  "ExecutionController.EXECUTOR_ROLE"
];

for (const role of requiredRoles) {
  check(Boolean(plan.rolePlan?.[role]), `Missing role plan entry: ${role}`);
}

const result = {
  file: fullPath,
  status: errors.length === 0 ? "PASS" : "FAIL",
  errors,
  warnings,
  safeCount: Object.keys(plan.safes || {}).length,
  rolePlanEntries: Object.keys(plan.rolePlan || {}).length
};

console.log(JSON.stringify(result, null, 2));

if (errors.length > 0) {
  process.exit(1);
}
