# Signed Resolution Evidence Import Checklist

## Before importing evidence

- [ ] Evidence is real.
- [ ] Evidence is sanitized.
- [ ] Resolution title is present.
- [ ] Resolution reference is present.
- [ ] Resolution hash is present.
- [ ] Signed timestamp is present.
- [ ] Governance resolution signed flag is true.
- [ ] Resolution signing authorization recorded flag is true.
- [ ] Resolution signing authorization reference is present.
- [ ] Vote result reference is present.
- [ ] Capability matrix reference is present.
- [ ] Public status update reference is present.
- [ ] Evidence reference is present.
- [ ] Approved capabilities are empty for the restricted-mode all-disabled path.
- [ ] No private signer data is included.
- [ ] No private keys, seed phrases, passwords, or secrets are included.

## Rule

Do not import signed-resolution evidence unless every item is complete.
