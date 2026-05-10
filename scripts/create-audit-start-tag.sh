#!/usr/bin/env bash
set -euo pipefail

TAG_NAME="${1:-audit-start-v0.1.1}"

echo "Running audit-start gate..."
npm run audit:selection:gate

if [ -n "$(git status --short)" ]; then
  echo "Git working tree is not clean. Commit or revert changes before tagging."
  git status --short
  exit 1
fi

COMMIT=$(git rev-parse HEAD)
echo "Creating audit-start tag $TAG_NAME at $COMMIT"

git tag -a "$TAG_NAME" -m "AstraTreasury Protocol v0.1.1 audit start at $COMMIT"
git push origin "$TAG_NAME"

echo "Audit-start tag created: $TAG_NAME"
