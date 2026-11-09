# ATS Resume Deduplication & Canonical Identity Resolution Pipeline

> Multi-anchor fingerprinting and Disjoint-Set Union (Union-Find) to detect duplicate job applicants and guarantee fair shortlist quotas.

**Domain:** Scheduling / Applicant Tracking Systems  
**Architecture Pattern:** Typed Stage-based Pipeline DAG with Sagas & State Machine  

---

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


---

## 🛠️ Getting Started

### Prerequisites
- Node.js >= 22.0.0
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/systemflow-s2-resume-dedup.git
cd systemflow-s2-resume-dedup

# Install dependencies
npm install
```

### Running Tests & Typechecks

```bash
# Run the complete test suite (includes race condition & concurrency tests)
npm test

# Build production TypeScript output
npm run build

# Run typechecker
npm run typecheck
```

---

## 🏛️ Pipeline DAG Architecture

All pipeline stages are type-safe and execute in ordered succession. If any stage throws a transient error, compensating saga rollbacks run in reverse order to ensure 100% data consistency.

```
src/
├── core/                  # Embedded zero-dependency Pipeline Engine & Saga Rollback
│   ├── pipeline.ts
│   ├── types.ts
│   ├── logger.ts
│   └── errors.ts
├── stages/                # Modular pipeline stages
├── pipeline.ts            # Stage assembly & DAG orchestrator
├── types.ts               # Domain interfaces & state contracts
└── index.ts               # Public library API export
```

---

## 🚀 GitHub Actions CI

Every commit and pull request runs automated build, typecheck, and vitest race condition tests via `.github/workflows/ci.yml`.

## 📄 License
MIT
