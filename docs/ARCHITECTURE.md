# S2 — Resume Deduplication: Architecture

## Problem

An ATS (Applicant Tracking System) has 5 shortlist slots for a job with 3 vacancies.
One candidate applies 3 times under different email aliases but the same phone number or slightly modified resume.
Without deduplication, that candidate consumes 3 of the 5 shortlist slots.

## Solution Architecture

```
Application → [Fingerprint Stage] → [Dedup Stage] → [Score Stage] → [Shortlist Batch]
                     ↓                    ↓
             SHA-256 anchors:      Union-Find (DSU)
             - email hash          cluster merging
             - phone hash
             - content signature
```

### 1. Multi-Anchor Fingerprinting
Normalizes emails (stripping subaddresses, punctuation), phone numbers (digits only), and content signatures (prefix + length hash).

### 2. Disjoint Set Union (Union-Find)
Transitively groups identities into canonical clusters with $O(\alpha(n))$ nearly constant time per operation.

### 3. Fair Shortlist Allocation
Duplicates are blocked before consuming any ranking slots. Exactly `maxSlots` unique candidates are selected by highest qualification score.
