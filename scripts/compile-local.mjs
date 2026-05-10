import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const root = process.cwd();
const contractDir = path.join(root, "contracts");

function findSolidityFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findSolidityFiles(full);
    if (entry.isFile() && entry.name.endsWith(".sol")) return [full];
    return [];
  });
}

function resolveImport(importPath) {
  const candidates = [];
  if (importPath.startsWith("@")) {
    candidates.push(path.join(root, "node_modules", importPath));
  }
  candidates.push(path.join(root, importPath));
  candidates.push(path.join(contractDir, importPath));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { contents: fs.readFileSync(candidate, "utf8") };
    }
  }
  return { error: `Import not found: ${importPath}` };
}

const sources = Object.fromEntries(
  findSolidityFiles(contractDir).map((file) => [
    path.relative(root, file).replaceAll(path.sep, "/"),
    { content: fs.readFileSync(file, "utf8") }
  ])
);

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "cancun",
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"]
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: resolveImport }));
const errors = output.errors ?? [];
for (const err of errors) {
  console.log(`${err.severity.toUpperCase()}: ${err.formattedMessage}`);
}

if (errors.some((err) => err.severity === "error")) {
  process.exit(1);
}

const contractCount = Object.values(output.contracts ?? {}).reduce((count, fileContracts) => {
  return count + Object.keys(fileContracts).length;
}, 0);

fs.mkdirSync(path.join(root, "artifacts-local"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts-local", "solc-output.json"), JSON.stringify(output, null, 2));
console.log(`Local solc compile succeeded. Contracts compiled: ${contractCount}`);
