import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const tokenStatusFile = path.join(root, "public-docs", "token-status.json");

const tokenLogo256 = path.join(root, "public-docs", "assets", "token", "astratoken-logo-256.png");
const tokenLogo512 = path.join(root, "public-docs", "assets", "token", "astratoken-logo-512.png");
const tokenLogo1024 = path.join(root, "public-docs", "assets", "token", "astratoken-logo-1024.png");

const brandDir = path.join(root, "public-docs", "assets", "brand");
const brandJsonFile = path.join(root, "public-docs", "brand-status.json");
const brandHtmlFile = path.join(root, "public-docs", "brand.html");
const brandDocFile = path.join(root, "docs", "token", "ASTRATOKEN_BRAND_KIT.md");

fs.mkdirSync(brandDir, { recursive: true });
fs.mkdirSync(path.dirname(brandDocFile), { recursive: true });

function readJson(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function copyIfExists(from, to) {
  if (!fs.existsSync(from)) {
    throw new Error(`Missing required asset: ${from}`);
  }

  fs.copyFileSync(from, to);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[ch]));
}

const token = readJson(tokenStatusFile);

if (!/^0x[a-fA-F0-9]{40}$/.test(token.address || "")) {
  throw new Error("Missing valid token address in public-docs/token-status.json. Run npm run token:metadata first.");
}

copyIfExists(tokenLogo256, path.join(brandDir, "astratoken-logo-256.png"));
copyIfExists(tokenLogo512, path.join(brandDir, "astratoken-logo-512.png"));

if (fs.existsSync(tokenLogo1024)) {
  fs.copyFileSync(tokenLogo1024, path.join(brandDir, "astratoken-logo-1024.png"));
}

copyIfExists(tokenLogo256, path.join(root, "public-docs", "favicon.png"));
copyIfExists(tokenLogo256, path.join(root, "public-docs", "apple-touch-icon.png"));
copyIfExists(tokenLogo512, path.join(root, "public-docs", "og-image.png"));

const brand = {
  schema: "astra-brand-kit-v0.1",
  generatedAt: new Date().toISOString(),
  project: "AstraTreasury Protocol",
  token: {
    name: "AstraTreasury Token",
    symbol: "ASTP",
    network: "Base Mainnet",
    chainId: 8453,
    address: token.address
  },
  assets: {
    logo256: "https://astratreasury.ai/assets/brand/astratoken-logo-256.png",
    logo512: "https://astratreasury.ai/assets/brand/astratoken-logo-512.png",
    logo1024: fs.existsSync(path.join(brandDir, "astratoken-logo-1024.png"))
      ? "https://astratreasury.ai/assets/brand/astratoken-logo-1024.png"
      : null,
    favicon: "https://astratreasury.ai/favicon.png",
    appleTouchIcon: "https://astratreasury.ai/apple-touch-icon.png",
    socialPreview: "https://astratreasury.ai/og-image.png"
  },
  colors: {
    midnight: "#08111f",
    surface: "#0e1a2b",
    blue: "#67a7ff",
    green: "#41d49b",
    text: "#edf4fb",
    muted: "#9aaec4"
  },
  usage: {
    approved: [
      "Use the official AstraToken logo on public AstraTreasury token metadata pages.",
      "Use the logo for wallet visibility, token lists, and explorer update requests.",
      "Use restricted-mode language when displaying token identity."
    ],
    prohibited: [
      "Do not imply a public token sale is live.",
      "Do not imply ASTP is an investment product.",
      "Do not imply staking, rewards, buybacks, autonomous execution, or treasury funding are live."
    ]
  },
  restrictions: {
    publicTokenSale: false,
    realTreasuryFunding: false,
    stakingOrRewards: false,
    buybackProgram: false,
    autonomousExecution: false,
    mainnetExecutionQueue: false
  }
};

fs.writeFileSync(brandJsonFile, JSON.stringify(brand, null, 2) + "\n");

const assetRows = Object.entries(brand.assets)
  .filter(([_key, value]) => value)
  .map(([key, value]) => {
    return `<tr><td>${escapeHtml(key)}</td><td><a href="${escapeHtml(value)}">${escapeHtml(value)}</a></td></tr>`;
  })
  .join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Brand Kit</title>
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <meta property="og:title" content="AstraTreasury Protocol" />
  <meta property="og:description" content="Restricted Base Mainnet deployment with public monitoring and Safe-based governance controls." />
  <meta property="og:image" content="https://astratreasury.ai/og-image.png" />
  <meta property="og:url" content="https://astratreasury.ai/brand" />
  <meta name="twitter:card" content="summary_large_image" />
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
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    body {
      margin: 0;
      background: linear-gradient(180deg, #07101d, var(--bg));
      color: var(--text);
    }

    main {
      width: min(1040px, calc(100% - 40px));
      margin: 0 auto;
      padding: 46px 0 72px;
    }

    a { color: var(--blue); text-decoration: none; }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 28px;
      box-shadow: 0 22px 70px rgba(0,0,0,.28);
    }

    .hero {
      display: grid;
      grid-template-columns: 180px 1fr;
      gap: 28px;
      align-items: center;
    }

    img.logo {
      width: 170px;
      height: 170px;
      border-radius: 32px;
      border: 1px solid var(--border);
      background: #07101d;
    }

    h1 {
      margin: 0 0 10px;
      font-size: 40px;
      letter-spacing: -1px;
    }

    p {
      color: var(--muted);
      line-height: 1.65;
    }

    .grid {
      margin-top: 24px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }

    .panel {
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 18px;
      background: rgba(255,255,255,.03);
    }

    .panel h3 {
      margin: 0 0 8px;
      font-size: 16px;
    }

    .panel p {
      margin: 0;
      font-size: 14px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 18px;
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

    tr:last-child td {
      border-bottom: 0;
    }

    code {
      color: var(--muted);
      overflow-wrap: anywhere;
      font-size: 13px;
    }

    @media (max-width: 760px) {
      .hero, .grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
<main>
  <div class="card">
    <div class="hero">
      <img class="logo" src="/assets/brand/astratoken-logo-256.png" alt="AstraTreasury Token logo" />
      <div>
        <h1>AstraTreasury Brand Kit</h1>
        <p>
          Official public logo and metadata references for AstraTreasury Protocol and AstraTreasury Token.
          These assets are for token identity, explorer updates, wallet display, and public metadata.
        </p>
        <p>
          AstraTreasury remains in restricted Base Mainnet operation. Public token sale, treasury funding,
          staking/rewards, buybacks, autonomous execution, and execution queue activation are disabled.
        </p>
      </div>
    </div>

    <div class="grid">
      <div class="panel">
        <h3>Token</h3>
        <p>ASTP · Base Mainnet · ERC-20</p>
      </div>
      <div class="panel">
        <h3>Contract</h3>
        <p><code>${escapeHtml(token.address)}</code></p>
      </div>
      <div class="panel">
        <h3>Status</h3>
        <p>Restricted operational mode</p>
      </div>
    </div>

    <table>
      <thead><tr><th>Asset</th><th>URL</th></tr></thead>
      <tbody>${assetRows}</tbody>
    </table>
  </div>
</main>
</body>
</html>`;

fs.writeFileSync(brandHtmlFile, html + "\n");

const md = [
  "# AstraToken Brand Kit",
  "",
  "## Token",
  "",
  "Name: AstraTreasury Token",
  "Symbol: ASTP",
  "Network: Base Mainnet",
  "Chain ID: 8453",
  `Address: ${token.address}`,
  "",
  "## Official logo URLs",
  "",
  `- 256px: ${brand.assets.logo256}`,
  `- 512px: ${brand.assets.logo512}`,
  brand.assets.logo1024 ? `- 1024px: ${brand.assets.logo1024}` : "",
  "",
  "## Browser / social assets",
  "",
  `- Favicon: ${brand.assets.favicon}`,
  `- Apple touch icon: ${brand.assets.appleTouchIcon}`,
  `- Social preview: ${brand.assets.socialPreview}`,
  "",
  "## Usage rules",
  "",
  "- Do not imply a public token sale is live.",
  "- Do not imply ASTP is an investment product.",
  "- Do not imply staking, rewards, buybacks, autonomous execution, treasury funding, or execution queue activation are live."
].filter(Boolean).join("\n");

fs.writeFileSync(brandDocFile, md + "\n");

console.log("Wrote public-docs/brand-status.json");
console.log("Wrote public-docs/brand.html");
console.log("Wrote public-docs/favicon.png");
console.log("Wrote public-docs/apple-touch-icon.png");
console.log("Wrote public-docs/og-image.png");
console.log("Wrote docs/token/ASTRATOKEN_BRAND_KIT.md");
