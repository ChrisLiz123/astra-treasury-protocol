# Base Mainnet Deployment Manifest

## Status

Base Mainnet contracts deployed and post-deployment verification prepared.

## Important

This does not approve a public token sale, real treasury funding, staking, rewards, buybacks, or autonomous execution.

## Network

Base Mainnet

Chain ID: 8453

## Contracts

| Contract | Address | BaseScan |
|---|---|---|
| treasuryPolicy | `0xb55a0805ea8a26e7bd6f199c4e962964c332faf1` | https://basescan.org/address/0xb55a0805ea8a26e7bd6f199c4e962964c332faf1 |
| treasuryVault | `0xe5fd264246adad7107a0c42d75b7bd37c85e2c4a` | https://basescan.org/address/0xe5fd264246adad7107a0c42d75b7bd37c85e2c4a |
| signalRegistry | `0x75ea3857b9f4f7218764a508331b1e7b5518d652` | https://basescan.org/address/0x75ea3857b9f4f7218764a508331b1e7b5518d652 |
| executionController | `0xc6f7b5e2611e5b6c4bcab64fdc7c2f4f319acf59` | https://basescan.org/address/0xc6f7b5e2611e5b6c4bcab64fdc7c2f4f319acf59 |
| astraToken | `0xc7c39837d0e604eeb525fc8fc501a5475a20419b` | https://basescan.org/address/0xc7c39837d0e604eeb525fc8fc501a5475a20419b |

## Safes

| Safe | Address |
|---|---|
| governanceSafe | `0x8992B4173cf791Cf88eC36cd53b27F3BF22404D3` |
| treasurySafe | `0xe2554515AaC8a3835326a4Ed5e9F44c319BE335C` |
| executorSafe | `0xBea6124d6ed0CE1ce26e184A39e28B65eDCEE461` |
| signalerSafe | `0xf3270118e25c3BeAfA863caD4516e9E3aDCd48D1` |

## Safety status

- Public token sale: no
- Real treasury funding: no
- Staking/rewards launch: no
- Buyback program: no
- Autonomous execution: no

## Verification

Run:

```bash
bash reports/mainnet-verification/base-mainnet-verify-commands.sh
```
