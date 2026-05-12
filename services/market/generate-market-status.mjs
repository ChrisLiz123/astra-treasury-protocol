import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const tokenStatusFile = path.join(root, "public-docs", "token-status.json");
const publicJsonFile = path.join(root, "public-docs", "market-status.json");
const publicHtmlFile = path.join(root, "public-docs", "market.html");
const docFile = path.join(root, "docs", "token", "ASTRATOKEN_MARKET_DATA.md");

fs.mkdirSync(path.dirname(publicJsonFile), { recursive: true });
fs.mkdirSync(path.dirname(docFile), { recursive: true });

function readJson(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[ch]));
}

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function money(value) {
  const n = asNumber(value);

  if (n === null) return "Unavailable";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n < 1 ? 8 : 2
  }).format(n);
}

function compactMoney(value) {
  const n = asNumber(value);

  if (n === null) return "Unavailable";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2
  }).format(n);
}

async function fetchDexScreenerPairs(tokenAddress) {
  const endpoint = `https://api.dexscreener.com/token-pairs/v1/base/${tokenAddress}`;

  try {
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      return {
        ok: false,
        source: "dexscreener",
        endpoint,
        status: res.status,
        statusText: res.statusText,
        pairs: []
      };
    }

    const data = await res.json();

    const pairs = Array.isArray(data) ? data : Array.isArray(data?.pairs) ? data.pairs : [];

    return {
      ok: true,
      source: "dexscreener",
      endpoint,
      pairs
    };
  } catch (error) {
    return {
      ok: false,
      source: "dexscreener",
      endpoint,
      error: error.message,
      pairs: []
    };
  }
}

function chooseBestPair(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) return null;

  return [...pairs].sort((a, b) => {
    const aLiquidity = Number(a?.liquidity?.usd || 0);
    const bLiquidity = Number(b?.liquidity?.usd || 0);
    return bLiquidity - aLiquidity;
  })[0];
}

const token = readJson(tokenStatusFile);

if (!/^0x[a-fA-F0-9]{40}$/.test(token.address || "")) {
  throw new Error("Missing valid token address in public-docs/token-status.json. Run npm run token:metadata first.");
}

const dex = await fetchDexScreenerPairs(token.address);
const bestPair = chooseBestPair(dex.pairs);

const hasMarketData = Boolean(bestPair?.priceUsd);

const marketStatus = {
  schema: "astra-market-status-v0.1",
  generatedAt: new Date().toISOString(),
  project: "AstraTreasury Protocol",
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  token: {
    name: token.name || "AstraTreasury Token",
    symbol: token.symbol || "ASTP",
    address: token.address,
    decimals: token.decimals || 18,
    logoURI: token.logoURI || "https://astratreasury.ai/assets/token/astratoken-logo-256.png"
  },
  status: hasMarketData ? "PUBLIC_DEX_MARKET_DATA_AVAILABLE" : "NO_PUBLIC_DEX_MARKET_DATA",
  dataSource: {
    primary: "DEX Screener",
    ok: dex.ok,
    fetchedPairs: dex.pairs.length,
    error: dex.error || null
  },
  market: hasMarketData ? {
    priceUsd: bestPair.priceUsd || null,
    priceNative: bestPair.priceNative || null,
    liquidityUsd: bestPair.liquidity?.usd ?? null,
    volume24hUsd: bestPair.volume?.h24 ?? null,
    fdvUsd: bestPair.fdv ?? null,
    marketCapUsd: bestPair.marketCap ?? null,
    pairAddress: bestPair.pairAddress || null,
    pairUrl: bestPair.url || null,
    dexId: bestPair.dexId || null,
    baseToken: bestPair.baseToken || null,
    quoteToken: bestPair.quoteToken || null,
    priceChange24h: bestPair.priceChange?.h24 ?? null,
    txns24h: bestPair.txns?.h24 ?? null
  } : null,
  allPairs: dex.pairs.map((pair) => ({
    chainId: pair.chainId,
    dexId: pair.dexId,
    pairAddress: pair.pairAddress,
    url: pair.url,
    priceUsd: pair.priceUsd || null,
    liquidityUsd: pair.liquidity?.usd ?? null,
    volume24hUsd: pair.volume?.h24 ?? null,
    baseToken: pair.baseToken,
    quoteToken: pair.quoteToken
  })),
  restrictions: {
    publicTokenSale: false,
    realTreasuryFunding: false,
    stakingOrRewards: false,
    buybackProgram: false,
    autonomousExecution: false,
    mainnetExecutionQueue: false
  },
  publicStatement:
    hasMarketData
      ? "AstraTreasury publishes read-only public DEX market data when available. This does not approve a public token sale, treasury funding, staking/rewards, buybacks, or autonomous execution."
      : "No public DEX market data is currently available for ASTP. AstraTreasury remains in restricted operational mode with no public token sale, real treasury funding, staking/rewards, buybacks, or autonomous execution approved."
};

fs.writeFileSync(publicJsonFile, JSON.stringify(marketStatus, null, 2) + "\n");

const pairRows = marketStatus.allPairs.length === 0
  ? '<tr><td colspan="6">No public DEX pairs found.</td></tr>'
  : marketStatus.allPairs.map((pair) => {
      return `<tr>
<td>${escapeHtml(pair.dexId || "Unknown")}</td>
<td><code>${escapeHtml(pair.pairAddress || "")}</code></td>
<td>${escapeHtml(money(pair.priceUsd))}</td>
<td>${escapeHtml(compactMoney(pair.liquidityUsd))}</td>
<td>${escapeHtml(compactMoney(pair.volume24hUsd))}</td>
<td>${pair.url ? `<a href="${escapeHtml(pair.url)}" target="_blank" rel="noreferrer">View</a>` : ""}</td>
</tr>`;
    }).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraToken Market Data</title>
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

    body {
      margin: 0;
      background: linear-gradient(180deg, #07101d, var(--bg));
      color: var(--text);
    }

    a { color: var(--blue); text-decoration: none; }

    main {
      width: min(1100px, calc(100% - 40px));
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

    .hero {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 22px;
      align-items: center;
    }

    img {
      width: 100px;
      height: 100px;
      border-radius: 22px;
      border: 1px solid var(--border);
      background: #07101d;
    }

    h1 {
      margin: 0 0 10px;
      font-size: 38px;
      letter-spacing: -1px;
    }

    p {
      color: var(--muted);
      line-height: 1.65;
    }

    .stats {
      margin-top: 24px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }

    .stat {
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 18px;
      background: rgba(255,255,255,.03);
    }

    .label {
      color: var(--muted);
      font-size: 13px;
      margin-bottom: 8px;
    }

    .value {
      font-size: 24px;
      font-weight: 850;
    }

    .ok { color: var(--green); }
    .warn { color: var(--yellow); }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 18px;
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

    @media (max-width: 850px) {
      .hero, .stats {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
<main>
  <section class="card">
    <div class="hero">
      <img src="/assets/token/astratoken-logo-256.png" alt="AstraTreasury Token logo" />
      <div>
        <h1>AstraToken Market Data</h1>
        <p>
          Read-only public market status for AstraTreasury Token on Base Mainnet.
          Data appears only if public DEX market data is available.
        </p>
      </div>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="label">Status</div>
        <div class="value ${hasMarketData ? "ok" : "warn"}">${escapeHtml(hasMarketData ? "Data available" : "No market data")}</div>
      </div>
      <div class="stat">
        <div class="label">Price</div>
        <div class="value">${escapeHtml(money(marketStatus.market?.priceUsd))}</div>
      </div>
      <div class="stat">
        <div class="label">Liquidity</div>
        <div class="value">${escapeHtml(compactMoney(marketStatus.market?.liquidityUsd))}</div>
      </div>
      <div class="stat">
        <div class="label">24h volume</div>
        <div class="value">${escapeHtml(compactMoney(marketStatus.market?.volume24hUsd))}</div>
      </div>
    </div>
  </section>

  <section class="card">
    <h2>Public DEX pairs</h2>
    <table>
      <thead>
        <tr>
          <th>DEX</th>
          <th>Pair</th>
          <th>Price</th>
          <th>Liquidity</th>
          <th>24h Volume</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>${pairRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      ${escapeHtml(marketStatus.publicStatement)}
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/market">/api/public/market</a></p>
    <p><a href="/token">Token metadata</a></p>
    <p><a href="/wallet">Add ASTP to wallet</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

const md = [
  "# AstraToken Market Data",
  "",
  `Status: ${marketStatus.status}`,
  "",
  "## Important",
  "",
  marketStatus.publicStatement,
  "",
  "## Public endpoints",
  "",
  "- /market",
  "- /api/public/market",
  "",
  "## Restrictions",
  "",
  "- Public token sale: no",
  "- Real treasury funding: no",
  "- Staking/rewards: no",
  "- Buybacks: no",
  "- Autonomous execution: no",
  "- Mainnet execution queue: disabled"
];

fs.writeFileSync(docFile, md.join("\n") + "\n");

console.log("AstraToken Market Status");
console.log("========================");
console.log(`Status: ${marketStatus.status}`);
console.log(`Pairs fetched: ${dex.pairs.length}`);
console.log(`Price: ${marketStatus.market?.priceUsd || "Unavailable"}`);
console.log(`Wrote ${publicJsonFile}`);
console.log(`Wrote ${publicHtmlFile}`);
