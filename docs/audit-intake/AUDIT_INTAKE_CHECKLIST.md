# Audit Intake Checklist

## Before sending to auditor

- [ ] CI passing.
- [ ] npm run release:prepare passing.
- [ ] npm run audit:full passing.
- [ ] npm run safe:prepare passing.
- [ ] npm run mainnet:runbook:validate passing.
- [ ] npm run ops:status passing.
- [ ] npm run domain:check passing.
- [ ] Review packages rebuilt.
- [ ] Review packages checked for private files.
- [ ] Git status clean.
- [ ] Public GitHub repo current.
- [ ] Public site current.

## Materials to provide

- GitHub repository link.
- Audit candidate package.
- External review package.
- Mainnet planning package.
- Incident response package.
- Safe planning package.
- Mainnet runbook package.
- Deployment manifest.
- Known fixed issue note.

## Auditor kickoff questions

- What is your expected timeline?
- What is your pricing model?
- What is your retest policy?
- What report format do you use?
- How do you classify severity?
- Do you review off-chain operational scripts?
- Do you review Safe role-transfer plans?
- Do you provide mainnet readiness comments?
