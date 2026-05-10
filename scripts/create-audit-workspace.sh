#!/usr/bin/env bash
set -euo pipefail

TAG_NAME="${1:-audit-start-v0.1.1}"
BRANCH_NAME="${2:-audit/v0.1.1}"

echo "Running audit kickoff gate..."
npm run audit:kickoff:gate

if [ -n "$(git status --short)" ]; then
  echo "Git working tree is not clean. Commit or revert changes before creating audit workspace."
  git status --short
  exit 1
fi

COMMIT=$(git rev-parse HEAD)
echo "Audit commit: $COMMIT"

if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
  echo "Tag already exists: $TAG_NAME"
else
  git tag -a "$TAG_NAME" -m "AstraTreasury Protocol v0.1.1 audit start at $COMMIT"
  git push origin "$TAG_NAME"
fi

if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
  echo "Branch already exists locally: $BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git push -u origin "$BRANCH_NAME"

echo "Audit workspace ready."
echo "Tag: $TAG_NAME"
echo "Branch: $BRANCH_NAME"
echo "Commit: $COMMIT"
