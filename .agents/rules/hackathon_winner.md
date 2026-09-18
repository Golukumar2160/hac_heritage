---
trigger: always_on
---

[SIH 2026 — BHARAT-DRISHTI | PS 26102 | TARGET: TOP 4 OUT OF 500 TEAMS]

PROJECT: Sovereign AI-Powered Fraud & Anomaly Detection Platform for MoSPI's MPLADS Scheme
STACK: FastAPI + React 19 + Vite | Gemini 2.0 Flash | SQLite WAL + Supabase PostgreSQL | RapidOCR + PyMuPDF | Isolation Forest + XGBoost + Benford's Law
EVALUATOR PROFILE: Senior MoSPI DIID Directors, NIC Chief Enterprise Architects, Senior Data Scientists, CAG/CVC Vigilance Auditors.
CORE DATASET: 98,649 real MoSPI works, ₹5,880 Crore sanctioned funds, ₹1,660 Crore funds under vigilance audit.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7 NON-NEGOTIABLE QUALITY PILLARS — APPLY TO EVERY RESPONSE & COMMIT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] STATUTORY GROUNDING — Zero Hallucinated Heuristics:
    Never invent arbitrary risk flags. Every anomaly and score MUST cite real Indian law:
    • Clause 3.2 → Mandatory annual fund earmarking: min 15% for SC areas, min 7.5% for ST areas.
    • GFR 2017 Rule 144 / 149 → GeM threshold & split-tendering evasion (issuing multiple work orders < ₹2.5L / ₹5L within 48-72h to evade mandatory open e-tenders).
    • Clause 4.1 & 5.2 → Strictly prohibited works (commercial, religious structures, private properties, recurring operational expenses).
    • PAC Audit Norms → Fund lapse velocity, unspent balance stagnation, and advance payment vs physical milestone divergence.

[2] 5-LAYER FORENSIC TRIANGULATION — Not an LLM Wrapper:
    Do NOT let an LLM "guess" fraud. The system mathematically triangulates every risk score:
    • L1 (Financial Integrity): Benford's Law (χ² test + Mean Absolute Deviation) on sanction/expenditure decimals to catch human-fabricated voucher amounts.
    • L2 (Tabular ML Ensemble): Isolation Forest + XGBoost on cost overrun ratio, execution duration variance, and milestone-to-fund release gaps.
    • L3 (Cartel & Collusion Graph): Bipartite Vendor-MP-Implementing Agency network graphs detecting bid clustering, single-vendor monopolization, and shared GSTIN/address anomalies.
    • L4 (Computer Vision & Physical Asset Verification): Perceptual Hashing (pHash) on site inspection photos to flag "Ghost Works" (same photo uploaded for multiple work IDs) + camera EXIF/watermark tamper detection.
    • L5 (Executive AI Dossier Generator): Gemini 2.0 Flash synthesizing L1–L4 hard evidence into a formal, legally admissible Note-Sheet / Audit Dossier for a Divvstrict Magistrate.

[3] 4-TIER STAKEHOLDER VIEWS — Direct PS 26102 Compliance:
    Every insight, notification, and alert MUST target the exact authority responsible:
    • Ministry (MoSPI DIID): National fund utilization velocity, fiscal lapse forecasting, inter-state disparity, systemic cartel alerts.
    • State Nodal Authority (SNA): Cross-district bottlenecks, state treasury unspent balances, nodal clearance delays.
    • District Authority (District Magistrate / Collector): Field-level enforcement, inspection orders, contractor show-cause notices, tranche freeze controls.
    • Member of Parliament (Hon'ble MP): Constituency asset delivery progress, SC/ST mandatory quota tracker, grievance monitoring.

[4] CVC-COMPLIANT TAMPER-EVIDENT AUDIT TRAIL:
    Evaluators fear audit-log alteration by compromised local administrators:
    • Every audit flag, inspection note, and status update is sealed with a salted SHA-256 hash chain linked back to the system GENESIS_SEAL.
    • Non-repudiation: Framed strictly as CVC & Court of Law admissible evidentiary chain of custody.
    • Dual-ledger architecture: SQLite WAL (offline, edge-district resilience) + Supabase PostgreSQL (cloud synchronization).

[5] SOVEREIGN GOV-TECH LUXURY UI — High-Trust Executive Interface:
    • NO juvenile green-on-black hacker terminal themes.
    • Deep navy slate palette (#0B132B / #0F172A), crisp high-contrast cards, emerald-amber-crimson statutory status chips, authoritative typography (Inter/Outfit), and SVG India choropleth risk maps.
    • Real-time SSE streaming for live batch audit runs. Sub-second transitions. Zero layout shifts (CLS = 0).

[6] ZERO-CRASH DEFENSIVE BACKEND:
    • No unhandled exceptions. No 500s on unexpected inputs. No silent `except: pass`.
    • All AI & external network calls wrapped in strict 2.0s timeouts with rule-based fallback responses.
    • All pandas/polars operations defensively cast: `pd.to_numeric(df[col].astype(str).str.replace(','), errors='coerce').fillna(0)`.
    • All shared state mutations protected by `threading.Lock()`.
    • Real model strings only: `gemini-2.0-flash` or `gemini-1.5-flash` (no deprecated or unreleased models).

[7] PROOF-FIRST & ZERO PLACEHOLDERS:
    • Zero `// TODO`, zero mock array stubs, zero hardcoded dummy metrics.
    • Every endpoint, component, or algorithm added must be immediately accompanied by execution proof (HTTP 200, valid JSON schema, automated test assertion).
    • Grounded in real metrics: 98,649 works, ₹5,880 Cr sanctioned, ₹1,660 Cr funds scrutinized.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
