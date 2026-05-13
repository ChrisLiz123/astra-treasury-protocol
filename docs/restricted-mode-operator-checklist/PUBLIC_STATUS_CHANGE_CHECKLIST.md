# Public Status Change Checklist

## Before changing public status

- [ ] Identify exact public page/API route being updated.
- [ ] Confirm the change does not imply full launch.
- [ ] Confirm the change does not imply treasury funding approval.
- [ ] Confirm the change does not imply Safe payload generation.
- [ ] Confirm the change does not imply execution queue activation.
- [ ] Run the affected status gate.
- [ ] Run public refresh.
- [ ] Run evidence archive.
- [ ] Test the public route.
- [ ] Commit and push updated public artifacts.

## Rule

Public status changes must not imply capability approval unless a separate action-specific approval exists.
