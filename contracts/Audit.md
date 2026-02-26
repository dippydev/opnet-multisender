# BobMultiSender Security Audit Report

**Contract:** `contracts/src/multisender/BobMultiSender.ts`
**Framework:** OPNet (Bitcoin L1) / AssemblyScript WASM
**Auditors:** Bob OPNet Auditor + General Smart Contract Security Agent
**Date:** 2026-02-25

> **DISCLAIMER:** This is an AI-assisted audit. It is NOT a substitute for a professional human audit. Do NOT deploy to production based solely on this review.

---

## Summary

The contract is **well-written** and follows OPNet best practices. It never custodies tokens, uses SafeMath throughout, has ReentrancyGuard, bounded loops, and caps fees at 5%. No fund-draining exploits were found. However, there are actionable findings:

---

## HIGH

### H-1: Missing zero-address validation on `setTreasury` and `transferOwnership`

**Lines 104, 159** — Neither function validates against the zero address.

- `setTreasury(Address.zero())` → all future fees are sent to the zero address, permanently burning them (or reverting all multiSend calls if the token blocks zero-address transfers)
- `transferOwnership(Address.zero())` → permanently locks all admin functions since nobody can satisfy `_onlyOwner()`

**Fix:**
```typescript
// Add to both transferOwnership and setTreasury:
if (newOwner.equals(Address.dead())) {
    throw new Revert('Zero address');
}
```

---

## MEDIUM

### M-1: Fee rounding enables zero-fee bypass for small transfers

**Lines 349-365** — Integer division rounds down:
```typescript
feeAmount = SafeMath.div(SafeMath.mul(totalAmount, feeBps), FEE_DENOMINATOR)
```

When `totalAmount * feeBps < 10,000`, fee rounds to zero and the early-return skips collection entirely. A user can split batches into small transactions to avoid fees.

**Example:** Fee = 100 bps (1%), token has 8 decimals. Any multiSend with total < 100 smallest units pays zero fee.

**Fix options:**
1. Round up: `(totalAmount * feeBps + FEE_DENOMINATOR - 1) / FEE_DENOMINATOR`
2. Add a minimum flat fee alongside the percentage
3. Accept as intended (small amounts = negligible fees anyway)

### M-2: Zero-amount transfers waste gas but aren't rejected

**Lines 211-218, 270** — `amounts[i]` can be `u256.Zero` in `multiSend`, and `amountEach` can be zero in `multiSendEqual`. Each zero-amount entry still triggers a full cross-contract `TransferHelper.transferFrom` call for nothing.

**Fix:** Add `if (u256.eq(amountEach, u256.Zero)) throw new Revert('Zero amount');`

### M-3: Duplicate recipients not validated

**Lines 190-240** — The same address can appear multiple times in the recipients array. Not exploitable for theft (sender pays for all), but misleads `recipientCount` in events and wastes cross-contract call gas. This is an acceptable trade-off (dedup in WASM is expensive) but should be documented and validated frontend-side.

---

## LOW

### L-1: Dual authority model (owner vs deployer) undocumented

`onUpdate()` uses `onlyDeployer` (immutable), admin functions use `_onlyOwner` (transferable). After `transferOwnership()`, the new owner controls fees/pause/treasury but cannot upgrade. If the deployer key is compromised, the attacker can upgrade to arbitrary code, bypassing all owner protections.

### L-2: No dedicated FeeCollected event

`_collectFee` does a `transferFrom` to treasury but only reports the fee in `MultiSendExecutedEvent`. Off-chain indexers monitoring just this contract's events lack fine-grained fee tracking.

### L-3: Fee stored as u256 but max value is 500

Per Bob's data compaction audit checklist, basis-point fields should use `u16` (not `u256`). The ABI uses `ABIDataTypes.UINT256` for a value capped at 500. This wastes 30 bytes per calldata read. Not a security issue, but a gas/data efficiency concern.

---

## INFO

### I-1: ABI JSON marks admin functions as `onlyOwner: false`

The generated `BobMultiSender.abi.json` shows `"onlyOwner": false` for `setFee`, `pause`, `setTreasury`, etc. Misleading for block explorers, though runtime enforcement is correct.

### I-2: Events array empty in generated ABI

`"events": []` in the ABI JSON, yet 6 events are emitted. Frontends using this ABI can't auto-decode events.

### I-3: ReentrancyGuard STANDARD is correct for this use case

Token receive callbacks (`ON_OP20_RECEIVED_SELECTOR`) are auto-excluded by `ReentrancyGuard`. A malicious token calling back into `multiSend` hits the lock and reverts. No action needed.

### I-4: Contract is stateless in core ops — stale storage (ATK-18) not applicable

The core methods don't write state; they only read `_paused`, `_feeBps`, `_treasury`, then do external calls. No state is modified between reads and external calls, so stale-storage-after-callback is not exploitable.

---

## Attack Vectors Verified Clear

| Vector | Result |
|--------|--------|
| Fund draining | NOT VULNERABLE — contract never holds tokens, uses `transferFrom` from sender |
| Reentrancy | PROTECTED — ReentrancyGuard STANDARD, callbacks excluded correctly |
| Constructor trap (ATK-01) | SAFE — constructor only calls `super()`, init in `onDeployment` |
| tx.origin phishing (ATK-04) | SAFE — uses `Blockchain.tx.sender` exclusively |
| Native Map corruption (ATK-07) | SAFE — no native `Map<>` used |
| Floating point (ATK-08) | SAFE — no `f32`/`f64` types |
| Storage pointer collision | SAFE — all via `Blockchain.nextPointer` |
| Integer overflow | SAFE — all arithmetic via `SafeMath` |
| Witness size overflow (ATK-16) | SAFE — 100 recipient cap, well within Bitcoin limits |
| Serialization mismatch (CRV-01) | SAFE — uses standard btc-runtime calldata methods |

---

## Recommendations Priority

1. **H-1** — Add zero-address checks to `setTreasury` and `transferOwnership` (two one-line fixes)
2. **M-2** — Reject zero-amount transfers in `multiSendEqual` (one-line fix)
3. **M-1** — Decide on fee rounding strategy (round-up or accept as-is)
4. **M-3** — Document duplicate-recipient behavior; validate on frontend
5. **L-1** — Document the owner vs deployer authority model
