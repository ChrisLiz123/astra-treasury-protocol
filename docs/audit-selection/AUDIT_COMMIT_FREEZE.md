# Audit Commit Freeze

## Purpose

Define the exact commit to be audited.

## Current status

Audit commit: TBD
Audit tag: TBD
Selected auditor: TBD
Freeze date: TBD

## Freeze requirements

- CI passing
- npm run release:prepare passing
- npm run audit:full passing
- npm run safe:prepare passing
- npm run mainnet:runbook:validate passing
- npm run audit:intake:gate passing
- npm run audit:outreach:gate passing
- npm run domain:check passing
- Git status clean

## Freeze command template

git tag -a audit-start-v0.1.1 -m "AstraTreasury Protocol v0.1.1 audit start"
git push origin audit-start-v0.1.1

## Rule

After the audit-start tag is created, contract changes should go through a patch/remediation workflow and be clearly communicated to the auditor.
