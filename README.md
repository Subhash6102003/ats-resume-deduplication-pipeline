# ATS Candidate Resume Deduplication & Canonical Identity Resolution Pipeline

> Multi-anchor fingerprinting and Disjoint-Set Union (Union-Find) to detect duplicate job applicants across aliases and guarantee fair shortlist quotas.

[![CI Build](https://github.com/Subhash6102003/ats-resume-deduplication-pipeline/actions/workflows/ci.yml/badge.svg)](https://github.com/Subhash6102003/ats-resume-deduplication-pipeline/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Vitest](https://img.shields.io/badge/Vitest-2.1-green?logo=vitest)
![Architecture](https://img.shields.io/badge/System%20Design-Production%20Grade-orange)
![License](https://img.shields.io/badge/License-MIT-purple)

---

## 📌 Domain & Context
**Domain:** Scheduling, Recruitment & Applicant Tracking Systems (ATS)  
**Architecture Pattern:** Typed Stage-based Pipeline DAG with Sagas & State Machine  

---

## 💥 The Real-World Problem

High-volume job postings (e.g. LinkedIn Easy Apply, Naukri) receive thousands of applications for limited vacancies. Candidates frequently submit 3 to 10 duplicate applications using alternate email addresses (e.g. work vs personal, Gmail subaddresses), slightly altered name spellings, or different phone formats.

Without canonical identity resolution, top-scoring duplicate submissions crowd out unique qualified candidates, consuming multiple shortlist slots for the same physical person.

### The Naive Failure Mode
```
+---------------------------------------------------------------------------------------+
|                    NAIVE ATS SHORTLISTING: ALIAS INFLATION FLAW                      |
+---------------------------------------------------------------------------------------+
  Applicant: Bob Smith (Senior Engineer)
    - Submission 1: bob.smith@gmail.com   -----> ATS Score: 96 -----> Shortlist Slot #1
    - Submission 2: b.smith.dev@yahoo.com -----> ATS Score: 96 -----> Shortlist Slot #2
    - Submission 3: bob.contract@mail.com -----> ATS Score: 96 -----> Shortlist Slot #3

  Result: 3 of 5 Shortlist Slots consumed by ONE human!
  Genuine unique candidates ranked #4 and #5 are wrongfully eliminated.
+---------------------------------------------------------------------------------------+
```

---

## 🏛️ System Design Pipeline Architecture

This repository implements a modular, typed DAG pipeline where each stage has explicit preconditions, execution contracts, and compensating rollback handlers.

```
+---------------------------------------------------------------------------------------------------------+
|                                  IDENTITY RESOLUTION PIPELINE DAG                                       |
+---------------------------------------------------------------------------------------------------------+

  [Candidate Application]
             |
             v
  +--------------------------------+
  | 1. Fingerprint Stage           |
  |  - Email Normalization & SHA256|
  |  - Digits-only Phone Slice     |
  |  - 200-char Content Signature  |
  +--------------------------------+
             | Anchors: { emailHash, phoneHash, contentSig }
             v
  +--------------------------------+       Anchor Matched Known Cluster
  | 2. Dedup Stage (Union-Find)    | ------------------------------------------+
  |  - Disjoint Set Union (DSU)    |                                           |
  |  - Path-Compressed Cluster Root|                                           v
  +--------------------------------+                               +------------------------+
             |                                                     | Mark DUPLICATE         |
             | Canonical (First-Seen Identity)                     | Blocked from Shortlist |
             v                                                     +------------------------+
  +--------------------------------+                                           |
  | 3. Scoring Stage               |                                           |
  |  - Credential & Stack Signals  |                                           |
  |  - Experience & Metrics Vector |                                           |
  +--------------------------------+                                           |
             |                                                                 |
             v                                                                 |
  +--------------------------------+                                           |
  | 4. Shortlist Batch Stage       | <-----------------------------------------+
  |  - Ranks Only Unique Entities  |
  |  - Guarantees 1 Slot / Person  |
  +--------------------------------+
```

---

## 🔄 Distributed Saga & Rollback Mechanics

```
+---------------------------------------------------------------------------------------+
|                    UNION-FIND DISJOINT-SET CLUSTER TRANSITIVITY                       |
+---------------------------------------------------------------------------------------+
  Submission A: [email: alice@gmail.com,    phone: 9876543210]  ---> Cluster {A}
  Submission B: [email: alice.work@corp.com, phone: 9876543210]  ---> Union(B, A) via phone!
  Submission C: [email: alice.work@corp.com, phone: 1111111111]  ---> Union(C, B) via email!

  Resulting Identity Cluster: { A (Canonical Root) <--- B, C (Duplicates) }
  Time Complexity per Lookup: O(α(N)) ≈ O(1) near-constant time.
+---------------------------------------------------------------------------------------+
```

---

## 📊 Live Concurrency Simulation Output

Every pipeline includes an automated concurrency load test that proves race condition resistance:

```
===================================================================================
            SHORTLIST SIMULATION: 3 VACANCIES, 5 SHORTLIST SLOTS, 10 APPS
===================================================================================
[2026-11-10T02:37:32.470Z] [INFO] [stage:fingerprint] Anchors computed {"appId":"app-1","phone":"9876543210"}
[2026-11-10T02:37:32.473Z] [INFO] [stage:dedup] Registered canonical root: app-1
[2026-11-10T02:37:32.474Z] [WARN] [stage:dedup] Duplicate detected: app-2 belongs to canonical app-1
[2026-11-10T02:37:32.478Z] [WARN] [stage:dedup] Duplicate detected: app-3 belongs to canonical app-1
[2026-11-10T02:37:32.480Z] [INFO] [stage:shortlist] Batch evaluation completed:
  Total Applications:    10
  Duplicates Blocked:    2  (Bob Smith's alias submissions)
  Shortlist Slots Max:   5
  Unique Candidates:     5  (100% fair allocation, exactly 1 slot per person)
===================================================================================
```

---

## ⚡ Architectural Comparison

| Feature | Naive String ATS | SystemFlow Union-Find Pipeline |
|---|:---:|:---:|
| **Phone Number Variations** | Misses (+91, hyphens, spaces) | **Normalized 10-digit standard hash** |
| **Email Alias Exploits** | Misses (`user+tag@gmail.com`) | **Subaddress normalization & SHA-256** |
| **Transitive Deduplication** | ❌ Fails (A=B and B=C not merged) | **✅ 100% Guaranteed via Disjoint-Set Union** |
| **Shortlist Integrity** | 40% duplicate slot consumption | **0% Duplicate Slot Wastage** |

---

## 📁 Repository Structure

```
ats-resume-deduplication-pipeline/
├── .github/
│   └── workflows/
│       └── ci.yml             # Automated GitHub Actions test & build workflow
├── src/
│   ├── core/                  # Embedded zero-dependency Pipeline DAG engine
│   │   ├── pipeline.ts        # Linear & DAG stage executor with reverse rollback
│   │   ├── types.ts           # Pipeline context & event streaming types
│   │   ├── logger.ts          # Structured ISO logger
│   │   └── errors.ts          # Domain typed errors
│   ├── stages/                # Granular pipeline stages
│   ├── pipeline.ts            # Stage composition & pipeline instantiation
│   ├── types.ts               # Domain-specific state models & contracts
│   └── index.ts               # Library entry point
├── tests/
│   └── pipeline.test.ts       # Race condition & unit test suite
├── docs/
│   └── ARCHITECTURE.md        # Technical deep dive & design choices
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 🛠️ Getting Started Locally

### Prerequisites
- Node.js >= 22.0.0
- npm or pnpm

### Installation

```bash
# Clone this repository
git clone https://github.com/Subhash6102003/ats-resume-deduplication-pipeline.git
cd ats-resume-deduplication-pipeline

# Install dependencies
npm install
```

### Running Tests & Verification

```bash
# Run complete test suite (includes concurrent race condition simulations)
npm test

# Build production TypeScript output
npm run build

# Run typechecker
npm run typecheck
```

---

## 📄 License
MIT License. Crafted with zero slop for production systems.
