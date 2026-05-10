# Backup and Restore Runbook

## Backup command

npm run ops:backup

## Snapshot command

npm run ops:snapshot

## What backups should include

- Source code.
- Public manifests.
- Docs.
- Local reports.
- Queue state.

## What backups must not include in public packages

- Private keys.
- Hardhat keystore values.
- Secret RPC keys.
- .env files.

## Restore drill

1. Create a fresh server or temporary directory.
2. Restore source package.
3. Install dependencies.
4. Run release checks.
5. Run audit checks.
6. Confirm public site can start.
7. Confirm dashboard can start locally.

## Mainnet rule

Backup and restore must be tested before mainnet.
