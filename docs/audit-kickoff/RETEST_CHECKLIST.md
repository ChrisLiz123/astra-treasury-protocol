# Retest Checklist

## Purpose

Track what must be retested after audit fixes.

## Required commands

npm run release:prepare
npm run audit:full
npm run safe:prepare
npm run mainnet:runbook:validate
npm run audit:intake:gate
npm run audit:selection:gate
npm run domain:check

## Required review

- Reproduction case no longer works.
- Regression test added where practical.
- Contract behavior documented.
- Public docs updated if needed.
- Auditor retest requested if applicable.

## Rule

No finding is closed until the fix is retested and documented.
