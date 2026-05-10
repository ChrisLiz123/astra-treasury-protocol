#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1-public-testnet-source"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE"
mkdir -p "$STAGE/deployments"

[ -d contracts ] && cp -a contracts "$STAGE/"
[ -d scripts ] && cp -a scripts "$STAGE/"
[ -d services ] && cp -a services "$STAGE/"
[ -d docs ] && cp -a docs "$STAGE/"
[ -d .github ] && cp -a .github "$STAGE/"\n[ -d foundry-test ] && cp -a foundry-test "$STAGE/"\n[ -d lib ] && cp -a lib "$STAGE/"

[ -f deployments/base-sepolia.public.json ] && cp deployments/base-sepolia.public.json "$STAGE/deployments/"

for f in package.json package-lock.json hardhat.config.ts tsconfig.json foundry.toml .gitmodules README.md LICENSE DISCLAIMER.md SECURITY.md CONTRIBUTING.md .gitignore
do
  [ -f "$f" ] && cp "$f" "$STAGE/"
done

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" \) -delete

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE"
