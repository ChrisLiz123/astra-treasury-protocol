# Audit Kickoff Packet

## Purpose

Single document to send to the selected auditor at kickoff.

## Include

- GitHub repository link
- Audit-start tag
- Audit candidate package
- Audit intake package
- External review package
- Mainnet planning package
- Incident response package
- Safe planning package
- Mainnet runbook package
- Known fixed issue note
- Expected deliverables
- Communication channel

## Key project links

Public site:
https://astratreasury.ai
https://www.astratreasury.ai

GitHub repository:
TBD

Audit start tag:
TBD

## Known fixed issue

v0.1.0 allowed cancelled SignalRegistry signals to execute through ExecutionController.

v0.1.1 patched this so cancelled signals revert before treasury execution.
