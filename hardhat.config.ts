import path from "node:path";
import { fileURLToPath } from "node:url";
import { configVariable, defineConfig } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localSolcPath = path.join(__dirname, "node_modules", "solc", "soljson.js");

export default defineConfig({
  plugins: [hardhatToolboxViem],
  solidity: {
    version: "0.8.28",
    path: localSolcPath,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "cancun"
    }
  },
  networks: {
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op"
    },
    baseSepolia: {
      type: "http",
      chainType: "op",
      chainId: 84532,
      url: configVariable("BASE_SEPOLIA_RPC_URL"),
      accounts: [configVariable("BASE_SEPOLIA_PRIVATE_KEY")]
    },
    baseMainnet: {
      type: "http",
      chainType: "op",
      chainId: 8453,
      url: configVariable("BASE_MAINNET_RPC_URL"),
      accounts: [configVariable("BASE_MAINNET_PRIVATE_KEY")]
    }
  },
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY")
    }
  },
  test: {
    solidity: {
      fuzz: {
        runs: 256
      }
    }
  }
});
