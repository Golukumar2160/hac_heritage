# FULL PROJECT DEEP BUG AUDIT — DO NOT MODIFY CODE

You are a **senior software architect, backend engineer, frontend engineer, DevOps engineer, security engineer, database engineer, QA engineer, and code reviewer** conducting a complete forensic audit of this project.

Your job is to **UNDERSTAND THE ENTIRE PROJECT FIRST** and then identify **EVERY BUG, defect, inconsistency, missing implementation, security issue, architectural problem, integration problem, and potential runtime failure**.

## 🚨 ABSOLUTE RULE: DO NOT MODIFY THE PROJECT

You are strictly prohibited from:

* Editing any file
* Changing any line of code
* Fixing any bug
* Refactoring code
* Reformatting code
* Renaming files or variables
* Creating replacement files
* Installing packages
* Updating dependencies
* Running automatic fix commands
* Applying patches
* Deleting anything
* Moving files
* Changing configuration
* Changing environment variables
* Changing database data
* Changing API behavior

**READ AND ANALYSE ONLY.**

Your output must be an **AUDIT REPORT**, not a modified project.

---

# PHASE 1 — UNDERSTAND THE COMPLETE PROJECT

Before identifying bugs, inspect the project recursively.

Start from the project root and go through:

**EVERY folder → EVERY subfolder → EVERY file → EVERY relevant line of code.**

Do NOT inspect only the obvious source folders.

Inspect, where present:

* Frontend
* Backend
* APIs
* Routes
* Controllers
* Services
* Models
* Schemas
* Database layer
* Authentication
* Authorization
* Middleware
* Utilities
* Configuration
* Environment handling
* Components
* Pages
* Hooks
* State management
* API clients
* Forms
* Validation
* Error handling
* Tests
* Scripts
* Deployment files
* Docker files
* CI/CD
* Documentation
* Package/dependency files
* Configuration files
* Static assets where relevant
* Database migrations
* Seed files
* Background jobs
* WebSockets
* External integrations
* AI/ML components
* Logging
* Monitoring
* Security-related code

Also inspect:

* `package.json`
* `requirements.txt`
* `pyproject.toml`
* `Dockerfile`
* `docker-compose.yml`
* `.env.example`
* configuration files
* lock files
* API documentation
* README
* project documentation
* database schemas
* migration files
* test files

and any other project-specific files.

---

# PHASE 2 — BUILD A COMPLETE PROJECT MAP

Before reporting bugs, understand how the project works.

Create a mental model of:

### Architecture

Explain:

* Frontend architecture
* Backend architecture
* Database architecture
* Authentication architecture
* API architecture
* External services
* Data flow
* Request/response flow
* Important dependencies
* Communication between frontend and backend
* Communication between backend and database
* Important business logic

### Feature Map

Identify:

* Every major feature
* Every minor feature
* Every API endpoint
* Every frontend page
* Every important component
* Every database model/table
* Every authentication flow
* Every user flow

### Dependency Map

Determine:

* Which files depend on which files
* Which APIs are consumed by which frontend components
* Which backend routes call which services
* Which services interact with which models
* Which configuration values are required
* Which environment variables are required

Do this BEFORE producing the final bug report.

---

# PHASE 3 — LINE-BY-LINE CODE AUDIT

Now inspect the implementation extremely carefully.

For every important file:

1. Understand its purpose.
2. Inspect its imports.
3. Inspect every function/class/component.
4. Inspect parameters.
5. Inspect return values.
6. Inspect conditions.
7. Inspect loops.
8. Inspect error handling.
9. Inspect asynchronous behavior.
10. Inspect database interactions.
11. Inspect API interactions.
12. Inspect state changes.
13. Inspect validation.
14. Inspect edge cases.
15. Inspect assumptions.
16. Inspect interactions with other files.

Look for bugs even when the code appears syntactically correct.

Do NOT assume:

> "The code probably works."

Instead ask:

> "Under what circumstances can this code fail?"

---

# PHASE 4 — FIND ALL TYPES OF BUGS

Search for ALL of the following.

## 1. Critical Bugs

Examples:

* Application completely fails to start
* Database corruption
* Authentication bypass
* Authorization bypass
* Remote code execution
* Severe data loss
* Core functionality completely broken
* Production deployment failure
* Critical API failure
* Infinite loops
* System-wide crashes

---

## 2. High-Severity Bugs

Examples:

* Major feature doesn't work
* Incorrect business logic
* Important API failures
* Incorrect database operations
* Authentication problems
* Sensitive data exposure
* Race conditions
* Serious validation problems
* Major frontend/backend integration problems
* Incorrect state management
* Significant memory/resource issues

---

## 3. Medium-Severity Bugs

Examples:

* Feature partially fails
* Incorrect edge-case behavior
* Poor error handling
* Incorrect UI state
* API response inconsistencies
* Missing validation
* Incorrect calculations
* Unexpected behavior under certain inputs

---

## 4. Low-Severity Bugs

Examples:

* Minor UI issues
* Non-critical error messages
* Small inconsistencies
* Minor edge cases
* Cosmetic problems that have functional impact

---

# PHASE 5 — SECURITY AUDIT

Perform a dedicated security audit.

Check for:

* Hardcoded secrets
* API keys
* Password exposure
* JWT problems
* Weak authentication
* Broken authorization
* IDOR
* SQL injection
* NoSQL injection
* Command injection
* XSS
* CSRF
* SSRF
* Path traversal
* Unsafe file uploads
* Insecure CORS
* Missing rate limiting
* Sensitive information leakage
* Debug mode in production
* Insecure cookies
* Missing security headers
* Weak password handling
* Improper token expiration
* Improper session handling
* Privilege escalation
* Exposed internal APIs
* Unsafe environment-variable handling

Clearly distinguish between:

**Confirmed vulnerability**
and
**Potential vulnerability requiring verification.**

---

# PHASE 6 — FRONTEND AUDIT

Check every frontend feature for:

* Broken imports
* Incorrect routes
* Missing components
* Incorrect API calls
* Wrong API URLs
* Incorrect HTTP methods
* Incorrect request body
* Incorrect response handling
* Missing loading states
* Missing error states
* Incorrect state updates
* Race conditions
* Memory leaks
* Form validation problems
* Authentication state problems
* Authorization UI problems
* Broken navigation
* Incorrect conditional rendering
* Null/undefined crashes
* Browser-specific issues
* Incorrect localStorage/sessionStorage usage
* Missing cleanup
* Incorrect React hooks usage
* Infinite re-render possibilities
* Stale state
* Missing dependencies in hooks
* Broken pagination
* Incorrect filtering/searching
* UI functionality that does not match backend capabilities

---

# PHASE 7 — BACKEND AUDIT

Inspect:

* Routes
* Controllers
* Services
* Models
* Middleware
* Authentication
* Authorization
* Validation
* Database queries
* Transactions
* Error handling
* Async code
* API responses
* HTTP status codes
* Business logic
* Input sanitization
* File handling
* External APIs
* Background tasks

Look specifically for:

* Missing error handling
* Incorrect status codes
* Incorrect response structures
* Unhandled exceptions
* Incorrect database queries
* Missing transactions
* Race conditions
* N+1 queries
* Incorrect async behavior
* Resource leaks
* Incorrect validation
* Missing authorization checks
* Logic errors
* Incorrect assumptions about frontend input

---

# PHASE 8 — DATABASE AUDIT

Inspect every model/schema/migration/query.

Check:

* Incorrect relationships
* Missing foreign keys
* Incorrect data types
* Missing constraints
* Missing indexes
* Duplicate data
* Incorrect defaults
* Nullability problems
* Referential integrity
* Migration problems
* Transaction problems
* Race conditions
* Data consistency
* Query correctness
* Potential data loss
* Performance problems

---

# PHASE 9 — FRONTEND ↔ BACKEND INTEGRATION AUDIT

This is extremely important.

Compare the frontend and backend implementations.

For EVERY API endpoint, verify:

**Frontend expectation**

vs.

**Backend implementation**

Check:

* URL
* HTTP method
* Headers
* Authentication
* Request body
* Query parameters
* Path parameters
* Response structure
* Field names
* Data types
* Error responses
* Status codes

Find cases where:

> Backend supports a feature but frontend doesn't implement it.

Also find:

> Frontend expects a feature/API that backend doesn't provide.

Also find:

> Backend field names differ from frontend field names.

Also find:

> Backend returns one structure while frontend expects another.

---

# PHASE 10 — DOCUMENTATION VS CODE AUDIT

Compare the documentation/problem statement/README against the actual implementation.

Create a list of:

### Implemented features

### Partially implemented features

### Completely missing features

### Features implemented incorrectly

### Backend features not connected to frontend

### Frontend features without backend support

### Documented behavior that the code does not implement

---

# PHASE 11 — DEAD CODE & UNUSED IMPLEMENTATION

Identify:

* Unused files
* Unused functions
* Unused imports
* Unused variables
* Unused APIs
* Unused components
* Duplicate implementations
* Old implementations
* Dead routes
* Dead services
* Features that were started but never completed

Do not remove them.

Only report them.

---

# PHASE 12 — EDGE CASE ANALYSIS

For every major feature, ask:

"What happens if the input is..."

* Empty
* Null
* Undefined
* Zero
* Negative
* Extremely large
* Extremely small
* Duplicate
* Missing
* Invalid
* Malicious
* Unexpected type
* Expired
* Unauthorized
* Concurrent
* Repeated multiple times

Identify bugs caused by these cases.

---

# PHASE 13 — RUNTIME FAILURE ANALYSIS

Identify code that may fail only at runtime even though it passes syntax/static inspection.

Look for:

* Missing environment variables
* Incorrect paths
* Missing files
* Missing dependencies
* Incorrect dependency versions
* Port conflicts
* Database connection failures
* API failures
* Null values
* Incorrect assumptions
* Production-only failures
* Development-only assumptions
* Browser/runtime incompatibilities

---

# PHASE 14 — PERFORMANCE AUDIT

Identify:

* Unnecessary database queries
* N+1 queries
* Expensive loops
* Repeated API requests
* Unnecessary re-renders
* Memory leaks
* Large payloads
* Blocking operations
* Inefficient algorithms
* Missing pagination
* Missing caching where clearly required
* Resource exhaustion risks

Only report actual or reasonably supported problems.

Do not label something a bug merely because another implementation could theoretically be faster.

---

# PHASE 15 — CONFIGURATION & DEPLOYMENT AUDIT

Inspect:

* Environment variables
* Docker
* Docker Compose
* Build configuration
* Production configuration
* Development configuration
* CORS
* Ports
* Database configuration
* API URLs
* Frontend build configuration
* Backend startup
* Deployment scripts
* CI/CD configuration

Find configuration mismatches that could cause failure.

---

# PHASE 16 — TESTING AUDIT

Inspect existing tests.

Determine:

* What is tested
* What isn't tested
* Incorrect tests
* Tests that don't match implementation
* Missing critical test cases
* Missing edge-case tests
* Integration gaps
* Backend/frontend integration gaps

Do NOT treat "no test exists" automatically as a bug.

Classify it as a testing gap unless the absence directly creates a significant reliability risk.

---

# FINAL OUTPUT FORMAT

After completing the entire analysis, produce the final report in this exact structure.

# 1. EXECUTIVE SUMMARY

Give:

* Total bugs found
* Critical bugs
* High bugs
* Medium bugs
* Low bugs
* Security issues
* Integration issues
* Missing features
* Major architectural issues
* Major performance issues

Do NOT modify the project.

---

# 2. BUG MASTER LIST

Create a table:

| ID | Severity | Fix Priority | Bug | File | Line | Root Cause | Effect | Reproduction/Trigger | Confidence | Necessary to Fix? |
| -- | -------- | ------------ | --- | ---- | ---- | ---------- | ------ | -------------------- | ---------- | ----------------- |

Use severity:

* 🔴 CRITICAL
* 🟠 HIGH
* 🟡 MEDIUM
* 🟢 LOW

Use fix priority:

* P0 — Fix immediately
* P1 — Fix before production
* P2 — Fix soon
* P3 — Can be deferred

Use:

**Necessary to Fix?**

* YES
* NO
* RECOMMENDED
* DEPENDS

Use **Confidence**:

* CONFIRMED
* HIGH CONFIDENCE
* POSSIBLE
* NEEDS VERIFICATION

Do NOT invent line numbers. If exact line numbers cannot be determined, write:

`Line: Unable to determine`

---

# 3. DETAILED BUG REPORT

For EVERY bug, provide:

## BUG ID: BUG-001

**Severity:** 🔴 CRITICAL
**Priority:** P0
**Necessary to Fix:** YES
**Confidence:** CONFIRMED

**File:** `path/to/file`

**Line:** `123`

### What is wrong?

Clearly explain the problem.

### Why is it a bug?

Explain the technical reason.

### Root cause

Explain exactly what causes the problem.

### Effect

Explain what happens because of the bug.

### Who/what is affected?

Explain the affected feature, user flow, API, database, etc.

### How can it happen?

Describe the trigger/reproduction scenario.

### Related files

List files that participate in the problem.

### Evidence

Quote only the minimum necessary code snippet to demonstrate the issue.

**DO NOT MODIFY THE CODE.**

### Recommended fix direction

Explain WHAT needs to be addressed, but do NOT provide a modified code implementation unless specifically requested later.

---

# 4. FEATURE COMPLETENESS AUDIT

Create:

| Feature | Backend | Frontend | Database | Integration | Status | Problem |
| ------- | ------- | -------- | -------- | ----------- | ------ | ------- |

Use:

* ✅ Complete
* ⚠️ Partial
* ❌ Missing
* 🔴 Broken

---

# 5. BACKEND ↔ FRONTEND MISMATCH REPORT

For every mismatch:

| ID | Backend Behavior | Frontend Expectation | Mismatch | Effect | Severity |
| -- | ---------------- | -------------------- | -------- | ------ | -------- |

---

# 6. SECURITY REPORT

Separate security findings from normal bugs.

For each:

| ID | Severity | Vulnerability | Location | Attack/Failure Scenario | Impact | Confidence | Necessary to Fix? |
| -- | -------- | ------------- | -------- | ----------------------- | ------ | ---------- | ----------------- |

Clearly distinguish:

* Confirmed vulnerabilities
* Potential vulnerabilities
* Security hardening recommendations

Do not exaggerate theoretical risks.

---

# 7. MISSING FEATURES REPORT

List:

* Required but missing
* Partially implemented
* Backend implemented but frontend missing
* Frontend implemented but backend missing
* Documented but not implemented

---

# 8. DEAD CODE / UNUSED CODE REPORT

List:

| File | Function/Component | Why It Appears Unused | Confidence |
| ---- | ------------------ | --------------------- | ---------- |

Do NOT delete anything.

---

# 9. PERFORMANCE REPORT

List only meaningful performance problems.

| ID | Location | Problem | Impact | Severity | Necessary to Fix? |
| -- | -------- | ------- | ------ | -------- | ----------------- |

---

# 10. DATABASE REPORT

List:

* Schema problems
* Query problems
* Relationship problems
* Migration problems
* Integrity problems
* Transaction problems
* Performance problems

---

# 11. CONFIGURATION / DEPLOYMENT REPORT

Identify anything that can prevent:

* Installation
* Development startup
* Production startup
* Database connection
* Frontend build
* Backend build
* API communication
* Deployment

---

# 12. TESTING GAP REPORT

List important functionality that currently lacks adequate testing.

Separate:

**Actual bugs**

from

**Missing tests.**

Do not call every missing test a bug.

---

# 13. ROOT-CAUSE GROUPING

Group bugs that have the same underlying root cause.

For example:

### Root Cause A — API Response Mismatch

Affected bugs:

* BUG-003
* BUG-007
* BUG-012

Explain the common underlying problem.

This helps identify problems that can cause multiple downstream failures.

---

# 14. BUG DEPENDENCY / CASCADE ANALYSIS

Identify bugs where one bug causes other bugs.

Example:

`BUG-001 → causes BUG-004 → causes BUG-009`

Explain the chain.

This is extremely important because fixing one root cause may eliminate multiple downstream failures.

---

# 15. FIX PRIORITY ROADMAP

Do NOT modify the code.

Instead provide an ordered remediation roadmap:

### P0 — Immediate

List critical issues.

### P1 — Before production

List high-impact issues.

### P2 — Soon

List medium-impact issues.

### P3 — Later

List low-impact issues.

Do not provide an overall "best" or "worst" ranking. Prioritize based on documented technical impact and urgency.

---

# 16. FINAL PROJECT HEALTH SUMMARY

Give a factual summary of:

* What currently works
* What partially works
* What is broken
* What is missing
* What is risky
* What needs verification
* What should be fixed before production
* What can reasonably be deferred

Do NOT change anything in the project.

---

# 🚨 IMPORTANT ANALYSIS RULES

1. **Inspect the entire project before giving conclusions.**
2. **Do not stop after finding a few bugs.**
3. **Do not only inspect obvious files.**
4. **Trace dependencies across files.**
5. **Trace frontend → API → backend → database flows.**
6. **Trace authentication and authorization end-to-end.**
7. **Do not assume code works because it looks syntactically correct.**
8. **Do not assume something is a bug without technical evidence.**
9. **Distinguish confirmed bugs from possible bugs.**
10. **Do not invent line numbers.**
11. **Do not invent missing behavior.**
12. **Do not modify the code.**
13. **Do not silently fix anything.**
14. **Do not omit small bugs merely because major bugs exist.**
15. **Do not report the same bug multiple times unless it affects different independent root causes.**
16. **If multiple bugs share one root cause, identify the root cause and link the affected bugs.**
17. **Check both positive and negative execution paths.**
18. **Check edge cases.**
19. **Check failure cases.**
20. **Check security.**
21. **Check performance.**
22. **Check deployment.**
23. **Check configuration.**
24. **Check documentation against implementation.**
25. **Check backend and frontend compatibility.**
26. **Check whether existing features are actu**
