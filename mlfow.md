PHASE 1 — Comprehensive Project Understanding & Mental Model
The repository represents BHARAT-DRISHTI, a multi-tiered forensic anomaly detection platform designed to audit government disbursements under the Members of Parliament Local Area Development Scheme (MPLADS), governed by the Ministry of Statistics and Programme Implementation (MoSPI).

Mental Model & Execution Layers
Data Layer (data/): Contains cleaned sanctions (clean_sanctioned.csv), expenditures (clean_expenditure.csv), completed works (clean_completed.csv), and master generated anomaly flags (fraud_flags.csv, 98,649 records).
Tabular Machine Learning & Retraining (pipelines/):
fraud_models.py: 5-layer anomaly pipeline (Isolation Forest on 5 features + Sentence Transformers alias clustering + Deterministic rules + Logistic Regression completion probability + Weighted ensemble scorer).
train_mlflow.py: 30-day automated retraining script using Isolation Forest on 4 canonical features, logging to SQLite-backed MLflow and exporting models/isolation_forest.joblib.
validate.py: Ground-truth triangulation script checking rules vs. ensemble predictions, computing AUC-ROC (0.8748), and cross-validating against Benford's Law.
Forensic Engines (forensics/ & benford/):
forensics/: RapidOCR and PyMuPDF pipeline for inspecting site inspection photos, pHash (perceptual hashing) duplicate detection for identifying "ghost assets", and GPS/watermark tamper detection.
benford/: First-digit χ² and Mean Absolute Deviation (MAD) mathematical tests verifying voucher decimal fabrication.
Backend Application Layer (backend/):
FastAPI application (backend/main.py) routing into modular routers (works.py, audit.py, auth.py, geo.py, mlflow_router.py).
Shared data cache (backend/core/data_cache.py) with thread-safe file-modification-time invalidation.
Dual-ledger persistence (backend/core/database.py): Local SQLite in WAL mode for edge offline resiliency, and Supabase PostgreSQL for cloud synchronization.
Security engine (backend/core/security.py): PBKDF2-HMAC-SHA256 password hashing (100,000 rounds) + fallback legacy SHA-256 comparator + role-based access control (RBAC) scoping for Ministry, State, District, MP, and Citizen personas.
Frontend User Interface (frontend/src/):
React 19 + Vite SPA with Tailwind CSS and Recharts.
4-Tier stakeholder views: National Overview (Ministry), Geographic Map (State), Field Verification / Tranche Control (District), Constituency Dashboard (MP), Public Watchdog (Citizen).
Dedicated forensic modules: Benford's Law view, Vendor Cartel Network Graph, Grand Jury Model Validation & MLflow Governance panel, Audit Ledger with District Authority Surveillance, and Visual Forensics Lab.
PHASE 2 — Complete Architectural Topography
text
                                  +-------------------------------------------------------------+
                                  |                 SOVEREIGN EXECUTIVE FRONTEND                |
                                  |              (React 19 + Vite + Tailwind CSS)               |
                                  +-------------------------------------------------------------+
                                                                 |
                                              HTTP / REST & SSE (Port 3232 -> 8000)
                                                                 v
                                  +-------------------------------------------------------------+
                                  |                     FASTAPI CORE GATEWAY                    |
                                  |                    (backend/main.py:app)                    |
                                  +-------------------------------------------------------------+
                                    |              |               |               |          |
         +--------------------------+              |               |               |          +---------------------------+
         |                                         |               |               |                                      |
         v                                         v               v               v                                      v
+------------------+                     +------------------+ +---------+ +------------------+                  +------------------+
|   auth_router    |                     |   works_router   | | geo.py  | |   audit_router   |                  |  mlflow_router   |
| (JWT/PBKDF2 RBAC)|                     | (Flags/KPIs/Exp) | |(GeoJSON)| | (SHA-256 Ledger) |                  | (Lineage/Runs)   |
+------------------+                     +------------------+ +---------+ +------------------+                  +------------------+
         |                                         |                               |                                      |
         |                                         v                               v                                      v
         |                              +----------------------+       +-------------------------+              +-------------------+
         |                              | Data Cache & In-Mem  |       |   Batch Audit Engine    |              | MLflow Client     |
         |                              | (fraud_flags.csv)    |       | (isolation_forest.joblib|              | (data/mlflow.db)  |
         |                              +----------------------+       +-------------------------+              +-------------------+
         |                                                                         |                                      |
         v                                                                         v                                      v
+-----------------------------------------------------------------------------------------------------------------------------------+
|                                                 PERSISTENCE & ARTIFACT TIERS                                                      |
|  1. SQLite WAL: data/audit_log.db (dismissals hash chain, official_users, pipeline_runs)                                           |
|  2. Supabase PostgreSQL: Cloud official_users & cloud audit trail mirror                                                          |
|  3. MLflow SQLite: data/mlflow.db (experiments, runs, metrics, params, tags)                                                      |
|  4. MLflow Artifact Store: mlruns/1/models/ (model.pkl, MLmodel, conda.yaml)                                                       |
|  5. Production Joblib: models/isolation_forest.joblib                                                                              |
+-----------------------------------------------------------------------------------------------------------------------------------+
PHASE 3 — Project Requirements & Feature Implementation Status
Statutory / Functional Requirement	Expected Behavior	Implementation Status	Evidence in Code
Clause 3.2 SC/ST Affirmative Quotas	Earmark ≥15% SC, ≥7.5% ST annual allocations	✅ Fully Implemented	backend/routers/works.py:1670-1748 (vectorized), frontend/src/components/QuotaComplianceView.jsx
GFR 2017 Rule 144/149 Split Tendering	Detect clusters of work orders < ₹2.5L / ₹5L within 72h	✅ Fully Implemented	pipelines/fraud_models.py:380-450, backend/batch_audit_engine.py:280-320
Benford's Law Level 1 Forensic Audit	χ² & MAD first-digit tests on voucher decimals	✅ Fully Implemented	backend/routers/works.py:1330-1410, frontend/src/components/BenfordView.jsx
Bipartite Cartel & Syndicate Network	Vendor-MP-Implementing Agency bid clustering graphs	✅ Fully Implemented	backend/routers/works.py:1460-1550, frontend/src/components/VendorNetworkView.jsx
Tamper-Evident SHA-256 Audit Trail	Non-repudiation chain sealed with previous_hash & genesis	✅ Fully Implemented	backend/core/database.py:21, backend/routers/audit.py:65-125
Multi-Modal Image Forensics (pHash/OCR)	RapidOCR Hindi/English + pHash ghost asset matching	✅ Fully Implemented	forensics/, backend/routers/audit.py:340-420, frontend/src/components/VisualForensicsLab.jsx
Statutory PDF Dossier Export	Formally admissible DM court-ready audit note-sheet	✅ Fully Implemented	backend/pdf_generator.py, frontend/src/components/CaseFileModal.jsx:216
District Authority Surveillance	Auto-flag DAs dismissing anomalies with statistical bias	✅ Fully Implemented	backend/routers/audit.py:170-220, frontend/src/components/AuditLedgerView.jsx
30-Day Automated Retraining Schedule	Scheduled monthly retraining on fresh MoSPI data	🟡 Partially Implemented	pipelines/train_mlflow.py:103-226 (manual trigger works; background cron is OS-dependent)
Dynamic MLflow Model Registry Lifecycle	Registered Model entity, Staging/Production promotion	❌ Not Implemented	data/mlflow.db:registered_models count is 0; only logged to run artifact directory
Dynamic Runtime MLflow Model Serving	API queries model directly from MLflow registry	⚠️ Implemented Incorrectly	batch_audit_engine.py:37 loads static local file models/isolation_forest.joblib via joblib
Live Logistic Regression Completion Inference	Dynamic inference using serialized weights	⚠️ Implemented Incorrectly	pipelines/fraud_models.py:944-948 discards model; works.py:267 reads static CSV column
PHASE 4 — Comprehensive MLflow Codebase Audit
References Discovered
Dependencies: requirements.txt:17 specifies mlflow>=2.16.0.
Training Script: pipelines/train_mlflow.py:29-30 imports mlflow and mlflow.sklearn.
API Router: backend/routers/mlflow_router.py exposes:
GET /api/mlflow/status
GET /api/mlflow/runs
POST /api/mlflow/retrain
Orchestration: scraper/sync_pipeline.py:83-91 calls pipelines/train_mlflow.py via subprocess.run().
Configuration: backend/core/config.py:103-107 defines:
MLFLOW_TRACKING_URI: Defaults to SQLite URI in data/mlflow.db.
MLFLOW_EXPERIMENT_NAME: "BHARAT_DRISHTI_MPLADS_VIGILANCE".
MLFLOW_ARTIFACT_LOCATION: mlruns/.
CI/CD Workflow: ci_cd/workflows/ci.yml:67-69 executes python -m unittest tests/test_mlflow_pipeline.py.
Frontend Telemetry: frontend/src/services/api.js:520-538 and frontend/src/components/ModelValidationView.jsx:176-250.
PHASE 5 — In-Depth MLflow Technical Audit
1. Experiment Tracking
Creation: An experiment named BHARAT_DRISHTI_MPLADS_VIGILANCE is configured in pipelines/train_mlflow.py:120 via mlflow.set_experiment(EXPERIMENT_NAME).
Experiment ID: In data/mlflow.db, the experiment has experiment_id = 1 with artifact location file:C:/Users/shash/OneDrive/Desktop/hack_heritage/mlruns/1.
Isolation Issue: Local tracking URI defaults to sqlite:///data/mlflow.db. In multi-worker or cloud container environments, SQLite write locks will block concurrent experiment queries.
2. Parameters
Logged Parameters (pipelines/train_mlflow.py:158-166):
model_type: "IsolationForest"
n_estimators: 200
contamination: 0.05
random_state: 42
features: "cost_overrun,spend_progress_gap,fund_disbursed,sanction_amount"
retrain_cycle_days: 30
schedule: "1st_sunday_monthly"
Missing Parameters:
max_samples: Not logged (defaults to "auto").
bootstrap: Not logged.
n_jobs: Not logged.
preprocessing_imputer: Not logged.
feature_scaling: Not logged.
dataset_record_count: Logged only as a metric, not as a dataset parameter.
3. Metrics
Logged Metrics (pipelines/train_mlflow.py:169-177):
records_trained: 98649.0
anomalies_detected: 1880.0
critical_risk_count: 12.0
high_risk_count: 1868.0
anomaly_rate_pct: 1.91
mean_anomaly_score: 33.44
funds_at_risk_crores: 1045.64
Critical Missing Metrics:
Zero Supervised Evaluation Metrics: pipelines/validate.py computes precision, recall, F1, false positive rate, and AUC-ROC (0.8748), but NONE of these are logged to MLflow!
Zero Confusion Matrix Metrics: TP, FP, TN, FN are computed in validate.py but never recorded in MLflow runs.
Zero Generalization Split Metrics: The model is evaluated on the exact same dataset it is trained on; no hold-out validation metrics exist in the MLflow tracking store.
4. Artifacts
Artifact	Present / Missing / Incorrect	File System Location / Note
Trained Model (model.pkl)	Present	mlruns/1/models/m-.../artifacts/model.pkl
MLmodel Metadata (MLmodel)	Present	mlruns/1/models/m-.../artifacts/MLmodel
Python Environment (python_env.yaml)	Present	Generated automatically by mlflow.sklearn
Conda Environment (conda.yaml)	Present	Generated automatically by mlflow.sklearn
Model Signature	MISSING	MLmodel explicitly shows signature: null
Input Example	MISSING	input_example parameter omitted in mlflow.sklearn.log_model
Preprocessing Pipeline	MISSING	Preprocessing logic resides in script; no Scikit-Learn Pipeline logged
Evaluation Plots (ROC, PR, Residuals)	MISSING	No figures or plots logged via mlflow.log_figure
SHAP / Feature Importances	MISSING	No tree explainer summary logged
5. Model Logging & Registry
Flavor Used: mlflow.sklearn.log_model() with serialization_format="cloudpickle".
Model Registry Status: COMPLETELY UNUSED.
Querying registered_models table in data/mlflow.db returns: 0 rows.
registered_model_name argument is NOT passed to mlflow.sklearn.log_model().
No model stages (Production, Staging, Archived) or model aliases (@champion, @challenger) are registered in MLflow.
Serving Disconnect: The FastAPI backend (backend/batch_audit_engine.py:37) loads models/isolation_forest.joblib using standard joblib.load(). It does not load the model using mlflow.sklearn.load_model("models:/...") or mlflow.pyfunc.load_model().
6. Dataset Tracking (CAG Provenance)
CVC Statutory Hash: Tracked as a metadata string tag ("dataset_sha256": "3f4299fc3509...").
MLflow 2.x Dataset API: MISSING. The project does not use mlflow.data.from_pandas() or mlflow.log_input(). As a result, the datasets table in data/mlflow.db contains 0 rows.
Dataset Traceability: While the SHA-256 seal proves dataset integrity, MLflow does not log schema types, column statistics, or data profiling summaries.
7. Reproducibility Assessment
Reproducibility: PARTIAL

Why Partial?
random_state=42 is fixed, but pip_requirements are unpinned in the MLflow model flavor.
The local training run was performed on Python 3.13.9 (as seen in MLmodel:10), whereas the production Dockerfile specifies Python 3.11-slim. Cloudpickle binaries from Python 3.13 will fail to deserialize in Python 3.11.
Preprocessing code is not packaged inside an MLflow pyfunc or Scikit-Learn Pipeline wrapper.
PHASE 6 — Production-Level Code & Concurrency Audit
1. Synchronous Retrain Worker Blocking (backend/routers/mlflow_router.py:170)
python
@router.post("/retrain", summary="Trigger 30-Day Model Retraining Cycle")
def trigger_mlflow_retrain():
    from pipelines.train_mlflow import run_mlflow_training
    result = run_mlflow_training()
    return {"status": "success", "run_details": result}
The Issue: This endpoint executes run_mlflow_training() synchronously inside the async event loop thread. Fitting 200 trees across 98,649 works takes 10–25 seconds of 100% CPU utilization.
Production Consequence: During this time, all concurrent incoming HTTP requests to that Uvicorn worker are blocked. In single-worker deployments (such as Dockerfile:73 with --workers 1), the entire application becomes completely unresponsive, tripping Render's health check (HEALTHCHECK --timeout=5s).
2. Retraining Race Conditions & State Corruption
There is no mutex or threading lock around run_mlflow_training().
If two users trigger retraining simultaneously:
Both invoke mlflow.start_run(), triggering: mlflow.exceptions.MlflowException: A run is already active.
Both write concurrently to models/isolation_forest.joblib and data/processed/mlflow_latest_run.json, causing file tearing and corrupt pickle weights.
3. Model Stale In-Memory Caching in Batch Audit Engine
In backend/batch_audit_engine.py:
python
_IFOREST_MODEL = None
try:
    if os.path.exists(MODEL_PATH):
        _IFOREST_MODEL = joblib.load(MODEL_PATH)
except Exception as e: ...
_IFOREST_MODEL is loaded once when the module is first imported.
When /api/mlflow/retrain completes and writes a new isolation_forest.joblib, _IFOREST_MODEL is never reloaded into memory. The running backend continues executing predictions on the stale model until the entire service is rebooted.
PHASE 7 — Scalability & Bottleneck Audit
Scale Tier	Workload	Current Architecture Behavior	Primary Bottleneck
Small Scale (1–10 runs/day)	Development / Local Demo	Operates reliably within 2.5s responses.	Local disk storage.
Medium Scale (100–1,000 runs/day)	Multi-district audit pipelines	Fails on database locks: SQLite data/mlflow.db will throw sqlite3.OperationalError: database is locked.	SQLite concurrency ceiling.
Large Scale (10,000+ runs/day)	Enterprise national deployment	Total failure: Local filesystem fills up with unpruned mlruns/ pickle artifacts (300KB × 10,000 = 3GB/day).	Ephemeral container storage & uncoordinated model weights.
PHASE 8 — Security & Authorization Audit
Unauthenticated Retraining Endpoint:
/api/run-pipeline in backend/main.py:219 requires decode_token and role verification (user["role"] in ("ministry", "state")).
/api/mlflow/retrain in backend/routers/mlflow_router.py:170 has NO authentication dependency! Any unauthenticated external client can repeatedly post to /api/mlflow/retrain, causing persistent CPU denial-of-service.
Cloudpickle Remote Code Execution (RCE) Vulnerability:
train_mlflow.py:193 serializes models with serialization_format="cloudpickle". If the models/ directory or MLflow artifact store is compromised, deserializing untrusted pickles allows arbitrary code execution.
Hardcoded Tracking URI in SQLite:
MLFLOW_TRACKING_URI in train_mlflow.py:41 falls back to absolute local filesystem paths with OS separators, leaking internal folder paths into client manifests.
PHASE 9 — MLflow Storage Audit Matrix
Component	Current Storage Location	Stored Data	Persistent in Docker?	Production Suitable?
Tracking Metadata	data/mlflow.db (SQLite)	Run IDs, timestamps, status	❌ Ephemeral (Lost on container restart)	❌ No (Requires PostgreSQL)
Hyperparameters	data/mlflow.db (SQLite)	7 hyperparameters	❌ Ephemeral	❌ No
Metrics	data/mlflow.db (SQLite)	7 unsupervised metrics	❌ Ephemeral	❌ No
Tags	data/mlflow.db (SQLite)	CVC SHA-256 seal, stage	❌ Ephemeral	❌ No
Artifacts & Model	mlruns/1/models/	model.pkl, MLmodel, YAMLs	❌ Ephemeral	❌ No (Requires S3 / GCS / Supabase Storage)
Model Registry	None (Empty in DB)	0 models registered	❌ None	❌ No
Dataset Tracking	Tag string only	SHA-256 string	❌ None	❌ No
PHASE 10 — Model Lifecycle Trace & Disconnect Analysis
text
[Raw MoSPI Data]
       │
       ▼ (clean_data.py)
[Clean CSVs in data/processed/]
       │
       ├─────────────────────────────────────────────┐
       ▼ (pipelines/train_mlflow.py)                 ▼ (pipelines/fraud_models.py)
[Train Isolation Forest on 4 Features]        [Train Isolation Forest on 5 Features]
       │                                             │
       ├── Logs Run to MLflow (data/mlflow.db)       ├── Computes Model 2 (Vendor NLP)
       ├── Dumps models/isolation_forest.joblib      ├── Computes Model 3 (Rules)
       └── Writes mlflow_latest_run.json             ├── Computes Model 4 (Logistic Reg - DISCARDED)
                                                     ├── Computes Model 5 (Ensemble)
                                                     └── Writes data/processed/fraud_flags.csv
                                                                     │
                                                                     ▼ (backend/main.py)
                                                      [Served to Frontend Dashboards]
The Broken Lifecycle Links:
The Dual Model Disconnect: train_mlflow.py trains an Isolation Forest on 4 features and saves it to models/isolation_forest.joblib. However, the full dashboard (fraud_flags.csv) is generated by fraud_models.py using 5 features!
The Missing Logistic Regression Artifact: fraud_models.py:948 fits a StandardScaler and LogisticRegression to predict project completion probability, but neither is saved to disk or logged to MLflow. At runtime, /api/predict/completion merely reads the static precomputed column from fraud_flags.csv.
The Static Serving Disconnect: Running /api/mlflow/retrain updates models/isolation_forest.joblib, but does not update fraud_flags.csv. Thus, the UI metrics and work risk scores never change after retraining!
PHASE 11 — MLOps Maturity Assessment
Capability	Status	Factual Evidence
Experiment Tracking	Implemented	Runs, parameters, and basic metrics logged to data/mlflow.db.
Model Versioning	Partial	Runs produce unique run_ids, but no official Model Registry versions exist.
Model Registry	Missing	registered_models table is empty (0 rows).
Model Promotion (Stages/Aliases)	Missing	Stage "Production" is hardcoded in a JSON file; not governed in MLflow.
Dataset Versioning	Partial	Cryptographic SHA-256 hash computed and logged as a tag, but MLflow Dataset API is unused.
Data Drift Detection	Missing	No KS-test, Population Stability Index (PSI), or Evidently AI integration.
Concept Drift Monitoring	Missing	No rolling accuracy or anomaly-density tracking over time.
Automated Retraining Trigger	Implemented	Exposed via /api/mlflow/retrain and weekly cron in sync_pipeline.py.
Rollback Mechanism	Missing	No endpoint or CLI to restore a previous model version from MLflow.
Model Signature & Schema Enforcement	Missing	signature: null in MLmodel artifact descriptor.
PHASE 12 — Comprehensive Gap & Missing Work Breakdown
🔴 Critical Missing (Production Blockers)
Model Registry Activation: Registering trained models under registered_model_name="MPLADS_IsolationForest_Auditor".
Persistent Tracking Store: Migrating MLFLOW_TRACKING_URI from ephemeral local SQLite to Supabase PostgreSQL (postgresql://...).
Persistent Artifact Store: Directing MLflow artifacts to Supabase Storage / S3 / GCS rather than the local container disk.
Python Serialization Compatibility: Aligning development Python (3.13) and runtime Docker Python (3.11) to prevent pickle incompatibility.
Non-Blocking Background Retraining: Offloading retraining from the main thread to BackgroundTasks with concurrency locking.
🟠 High Priority Missing (MLOps Hardening)
Supervised Validation Logging: Logging validation AUC-ROC, precision, recall, and confusion matrices from validate.py into MLflow.
Model 4 (Logistic Regression) Serialization: Packaging and logging the StandardScaler + LogisticRegression pipeline into MLflow for live dynamic completion inference.
Single Source of Truth Feature Pipeline: Unifying the feature set between fraud_models.py and train_mlflow.py.
RBAC Protection on Retraining: Requiring Ministry or State credentials for /api/mlflow/retrain.
🟡 Medium Priority Missing
Frontend MLflow Runs Table: Rendering the mlflowRuns array in ModelValidationView.jsx.
Model Input Examples & Signatures: Generating Scikit-Learn model signatures via mlflow.models.infer_signature.
Automated Cache Reloading: Refreshing _IFOREST_MODEL in batch_audit_engine.py upon retraining completion.
PHASE 13 — Complete Bug Master List
ID	Location	Category	Severity	Must Fix?	Technical Impact
BUG-MLF-001	backend/routers/mlflow_router.py:170	Security & Reliability	🔴 CRITICAL	YES	Unauthenticated, synchronous CPU-blocking retrain triggers server freeze and DOS.
BUG-MLF-002	pipelines/train_mlflow.py:190	MLOps Architecture	🔴 CRITICAL	YES	Model logged as raw artifact; omitted from MLflow Model Registry (registered_models is empty).
BUG-MLF-003	Dockerfile:4 vs Local Dev	Environment Compatibility	🔴 CRITICAL	YES	Python 3.13 cloudpickle serialization will fail to unpickle in Python 3.11 Docker container.
BUG-MLF-004	render.yaml & Dockerfile	Cloud Persistence	🔴 CRITICAL	YES	data/mlflow.db and mlruns/ stored on ephemeral container disk; wiped on restart.
BUG-MLF-005	pipelines/fraud_models.py:213 vs train_mlflow.py:44	ML Consistency	🟠 HIGH	YES	Feature mismatch (5 features in batch pipeline vs 4 features in MLflow retraining).
BUG-MLF-006	backend/batch_audit_engine.py:37	Model Serving	🟠 HIGH	YES	In-memory _IFOREST_MODEL loaded at boot; never reloaded when model is retrained.
BUG-MLF-007	pipelines/fraud_models.py:948	Model Serving	🟠 HIGH	YES	Logistic Regression completion model is discarded; dynamic inference impossible.
BUG-MLF-008	pipelines/train_mlflow.py:190	MLOps Validation	🟡 MEDIUM	YES	Model signature and input examples are missing (signature: null).
BUG-MLF-009	frontend/src/components/ModelValidationView.jsx:37	Frontend UI	🟡 MEDIUM	YES	mlflowRuns state fetched from /api/mlflow/runs but never rendered in the DOM.
BUG-MLF-010	pipelines/train_mlflow.py:169	MLOps Governance	🟡 MEDIUM	YES	Validation metrics (AUC-ROC, F1, Precision) from validate.py omitted from MLflow runs.
PHASE 14 — Code Quality & Architectural Integrity
Separation of Concerns: High. Routers delegate to specialized modules (batch_audit_engine, security, database).
Technical Debt in Retraining:
pipelines/train_mlflow.py contains fallback synthetic data generation (SYNTH-00000). If clean data files are temporarily missing, it silently trains on 1,000 synthetic rows and marks the model as "Production" without throwing an exception.
Maintainability:
The coexistence of pipelines/fraud_models.py (legacy monolithic batch script) and pipelines/train_mlflow.py (modern MLflow pipeline) creates duplicate data transformations that can diverge over time.
PHASE 15 — Type Safety & Robustness Review
FastAPI Schemas: Pydantic v2 models in backend/routers/ provide solid input validation on endpoints.
Model Input Robustness:
In backend/batch_audit_engine.py:212, feature inputs are cast defensively: X = clean_df[["cost_overrun", "spend_progress_gap", "fund_disbursed", "sanction_amount"]].fillna(0)
However, in pipelines/train_mlflow.py:97, CANONICAL_FEATURES are extracted without verifying column data types, which can cause silent type coercion issues if raw strings enter the pipeline.
PHASE 16 — Training vs. Inference Parity
Step	Training (train_mlflow.py)	Inference (batch_audit_engine.py)	Parity Status
Feature 1: Cost Overrun	np.maximum(0.0, df["fund_disbursed"] - df["sanction_amount"])	np.maximum(0.0, df["fund_disbursed"] - df["sanction_amount"])	✅ MATCH
Feature 2: Progress Gap	(fund_disbursed / sanction) - (progress_pct / 100.0)	(fund_disbursed / sanction) - expected_ratio (Heuristic based on status text)	⚠️ MISMATCH
Feature 3: Fund Disbursed	Raw numeric INR value	Raw numeric INR value	✅ MATCH
Feature 4: Sanction Amount	Raw numeric INR value	Raw numeric INR value	✅ MATCH
Feature Scaling	None (Raw values)	None (Raw values)	✅ MATCH
Model Score Calculation	np.clip(50.0 - (dec * 120.0), 10.0, 95.0)	np.clip(50.0 - (dec * 120.0), 10.0, 95.0)	✅ MATCH
⚠️ Major Discrepancy Found in Feature 2:
In train_mlflow.py, spend_progress_gap uses actual physical completion percentage: progress_pct / 100.0.
In batch_audit_engine.py:202, it uses an arbitrary string heuristic: 1.0 if "complete" else 0.4 if "progress" else 0.1!
This means the model is being evaluated on features with completely different statistical distributions at inference time than during training!

PHASE 17 — API & MLflow Serving Architecture
text
[Frontend: POST /api/mlflow/retrain]
                 │
                 ▼
[FastAPI: mlflow_router.py] ── (Synchronous call blocks Uvicorn worker)
                 │
                 ▼
[pipelines/train_mlflow.py: run_mlflow_training()]
                 │
                 ├── Trains IsolationForest
                 ├── Logs to SQLite (data/mlflow.db)
                 ├── Writes artifacts to mlruns/
                 └── Dumps models/isolation_forest.joblib
                 │
                 ▼ (Returns HTTP 200 OK)
[Frontend receives success JSON]
                 │
                 ▼
[Backend in-memory _IFOREST_MODEL remains UNCHANGED]
Inference Reality: The API does not query MLflow at inference time. It queries local in-memory weights loaded at startup.
PHASE 18 — Cloud Deployment & Container Resiliency
Render Environment (render.yaml):
Runs Dockerfile with --workers 1.
Ephemeral disk: any models trained during a session via /api/mlflow/retrain are permanently lost when Render puts the free instance to sleep or redeploys!
Container Environment (Dockerfile):
Base image: python:3.11-slim.
Non-root user: drishti.
Port: Dynamic $PORT with fallback to 8000.
PHASE 19 — Testing Coverage Audit
Existing Tests:
tests/test_mlflow_pipeline.py contains 5 test cases testing feature preparation, training output, and the 3 FastAPI endpoints.
Missing Test Suites:
No test for concurrent retrain prevention (mutex contention).
No test for tracking server downtime recovery.
No test for model signature validation.
No test verifying inference output consistency before and after retraining.
PHASE 20 — Final Verdict & Actionable Roadmaps
🔴 MUST FIX BEFORE PRODUCTION (Genuine Blockers)
Fix Synchronous Retrain Blocking & Add Auth (backend/routers/mlflow_router.py:170):
Wrap retrain execution in FastAPI BackgroundTasks.
Protect with _retrain_lock = threading.Lock() to prevent concurrent collisions.
Enforce RBAC security: user=Depends(decode_token) requiring "ministry" role.
Align Development & Docker Python Environments:
Enforce Python 3.11 in development virtual environments to prevent Python 3.13 cloudpickle unpickling crashes in Docker.
Synchronize Inference & Training Feature Logic (Feature 2):
Align batch_audit_engine.py to calculate spend_progress_gap using progress_pct identical to train_mlflow.py.
Automate In-Memory Model Cache Invalidation:
Invalidate and reload _IFOREST_MODEL in batch_audit_engine.py immediately after a successful retraining run.
Persist MLflow Tracking & Artifacts to Cloud Storage:
Configure MLFLOW_TRACKING_URI to use Supabase PostgreSQL (postgresql://...).
Store model artifacts in Supabase Storage or an S3 bucket instead of the container's ephemeral filesystem.
🟠 SHOULD FIX FOR PRODUCTION QUALITY (Important Improvements)
Activate Official MLflow Model Registry:
Use registered_model_name="MPLADS_IsolationForest_Auditor".
Manage formal versions (v1, v2, v3) with model aliases (@champion, @challenger).
Log Supervised Validation Metrics to MLflow:
Incorporate the AUC-ROC (0.8748), precision, recall, and confusion matrix from validate.py into every MLflow retraining run.
Persist Model 4 (Logistic Regression Completion Engine):
Save the StandardScaler and LogisticRegression pipeline as an MLflow artifact so that /api/predict/completion performs real-time model inference.
Log Model Signatures & Input Examples:
Utilize mlflow.models.infer_signature(X, iso.predict(X)) and log input_example=X.head().
Render MLflow Runs in the Frontend:
Connect the existing mlflowRuns state in ModelValidationView.jsx to a visible history table.
🟢 OPTIONAL / FUTURE (Long-Term Enhancements)
Continuous Data & Model Drift Monitoring:
Integrate Evidently AI or automated KS-tests comparing incoming batch distributions against baseline sanction profiles.
Automated Rollback Webhook:
Automated rollback to alias @champion if newly retrained model metrics drop below statutory quality baselines.
Distributed Hyperparameter Search:
Multi-worker tuning for isolation forest contamination and estimator counts using Optuna or Ray Tune.
WHAT I WOULD IMPLEMENT NEXT (Ordered Implementation Sequence)
text
STEP 1: PRODUCTION SAFETY & CONCURRENCY
└── Refactor backend/routers/mlflow_router.py:
    ├── Add @router.post("/retrain", dependencies=[Depends(decode_token)])
    ├── Enforce role in ("ministry",)
    ├── Protect with threading.Lock()
    └── Execute via BackgroundTasks returning a 202 Accepted polling task.
STEP 2: TRAINING-INFERENCE PARITY
└── Unify feature engineering between pipelines/train_mlflow.py and backend/batch_audit_engine.py:
    ├── Standardize progress_pct normalization.
    └── Add a reload_model() trigger so the backend instantly serves fresh weights.
STEP 3: MLFLOW MODEL REGISTRY & METRICS EXPANSION
└── Enhance pipelines/train_mlflow.py:
    ├── Add registered_model_name="MPLADS_IsolationForest_Auditor".
    ├── Add model signature and input example.
    └── Import validate.py metrics to log AUC-ROC, Precision, and Recall into MLflow.
STEP 4: LOGISTIC REGRESSION COMPLETION SERVING
└── Refactor pipelines/fraud_models.py & backend/routers/works.py:
    ├── Export trained LogisticRegression + StandardScaler pipeline to models/completion_model.joblib.
    └── Make /api/predict/completion perform real-time model scoring for novel works.
STEP 5: UI TELEMETRY COMPLETION
└── Update frontend/src/components/ModelValidationView.jsx:
    └── Render the historical MLflow runs table displaying Run ID, Date, Anomaly Rate, and Model Hash.
