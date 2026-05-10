# Contract Verification

Verification assets are generated in:

```text
reports/verification/
```

Important files:

```text
reports/verification/standard-json-input.json
reports/verification/base-sepolia-contracts.json
reports/verification/base-sepolia-verify-commands.sh
reports/verification/manual-basescan-verification.md
reports/verification/constructor-args-no-0x/
```

Automated verification:

```bash
bash reports/verification/base-sepolia-verify-commands.sh
```

Manual verification:

```text
https://sepolia.basescan.org/verifyContract
```

Compiler: `0.8.28+commit.7893614a.Emscripten.clang`

Optimizer: enabled, runs 200

EVM version: cancun
