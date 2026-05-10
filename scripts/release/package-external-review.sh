#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="astra-treasury-protocol-v0.1.1-external-review"
STAGE="release/staging/$PKG_NAME"
ARCHIVE="release/$PKG_NAME.tar.gz"

rm -rf release/staging
rm -f "$ARCHIVE"
mkdir -p "$STAGE"

cp -a contracts "$STAGE/"
cp -a scripts "$STAGE/"
cp -a services "$STAGE/"
cp -a docs "$STAGE/"
cp -a deployments "$STAGE/"
cp -a .github "$STAGE/"

for f in package.json package-lock.json hardhat.config.ts tsconfig.json README.md LICENSE DISCLAIMER.md SECURITY.md CONTRIBUTING.md .gitignore
do
  [ -f "$f" ] && cp "$f" "$STAGE/"
done

rm -f "$STAGE/deployments/base-sepolia.env"

find "$STAGE" -type d \( -name node_modules -o -name reports -o -name backups -o -name artifacts -o -name cache -o -name release -o -name .git -o -name .hardhat -o -name out -o -name artifacts-local \) -prune -exec rm -rf {} +
find "$STAGE" -type f \( -name "*.env" -o -name ".env" -o -name "*.pem" -o -name "*.key" -o -name "*keystore*" \) -delete

tar -czf "$ARCHIVE" -C release/staging "$PKG_NAME"

echo "Created $ARCHIVE"
ls -lah "$ARCHIVE"
