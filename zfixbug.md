# COMPLETE PROJECT BUG FIXING — FIX ONE BUG AT A TIME

You have already performed a complete forensic audit of this project and produced a list of bugs.

Now your task is to **FIX THE BUGS I PROVIDE, ONE BY ONE, IN ORDER**.

Do not perform another broad rewrite of the project.

Do not randomly refactor the application.

Do not change unrelated functionality.

Your job is to carefully fix each listed bug while preserving the existing architecture and behavior wherever possible.

---

# 🚨 CORE RULES

## 1. FIX ONLY THE BUG I CURRENTLY REQUEST

I will provide bugs from the audit, for example:

`BUG-001`

You must work on **only that bug** first.

Do NOT automatically fix:

* BUG-002
* BUG-003
* BUG-004
* or any other bug

unless I explicitly tell you to.

If fixing the current bug necessarily requires a small related change, explain that dependency before making the change.

---

# 2. FIRST UNDERSTAND THE BUG

Before editing anything, inspect:

* The bug description
* The affected file
* The affected function/component
* Related files
* Dependencies
* Callers
* API flow
* Database flow if applicable
* Frontend/backend interaction if applicable

Do not blindly apply the fix based only on the bug description.

Verify that the reported bug actually exists in the current code.

If the code has changed since the audit and the bug no longer exists, tell me instead of making unnecessary changes.

---

# 3. TRACE THE BUG END-TO-END

Before changing code, determine:

**Where does the problem originate?**

Trace the complete flow where necessary:

```text
User Input
   ↓
Frontend
   ↓
API Request
   ↓
Route
   ↓
Controller
   ↓
Service
   ↓
Database
   ↓
Response
   ↓
Frontend
   ↓
UI
```

Not every bug requires the entire flow, but inspect enough surrounding code to identify the actual root cause.

---

# 4. IDENTIFY THE ROOT CAUSE

Before fixing the bug, explicitly determine:

### Bug ID

`BUG-001`

### Root cause

Explain exactly why the bug occurs.

### Affected files

List all files involved.

### Affected functionality

Explain what functionality is broken.

### Expected behavior

Explain what should happen.

### Current behavior

Explain what currently happens.

### Fix strategy

Explain what you intend to change.

Only after this analysis should you modify the code.

---

# 5. MAKE THE SMALLEST SAFE CHANGE

Follow the principle:

> **Minimum change required to correctly fix the bug.**

Do NOT:

* Rewrite working code unnecessarily
* Refactor unrelated code
* Rename unrelated variables
* Change project architecture
* Replace libraries unnecessarily
* Change APIs unnecessarily
* Change database structure unnecessarily
* Change styling unnecessarily
* Change working features
* Remove existing functionality

If one line fixes the root cause correctly, don't rewrite the entire function.

---

# 6. PRESERVE EXISTING FUNCTIONALITY

The fix must NOT break existing behavior.

Before changing code, understand what the existing implementation is intended to do.

After changing code, check:

* Existing functionality
* Related functionality
* Edge cases
* Error handling
* API compatibility
* Data compatibility
* Authentication/authorization
* Frontend/backend compatibility

---

# 7. DO NOT CREATE FAKE FIXES

Never make a superficial change just to make the bug appear fixed.

For example, do NOT:

* Hide an error instead of fixing its cause
* Suppress an exception
* Add unnecessary try/catch blocks
* Disable validation
* Remove functionality causing an error
* Hardcode a value to bypass a problem
* Add arbitrary delays
* Add arbitrary retries
* Ignore failed API calls
* Ignore database errors

Fix the **actual root cause**.

---

# 8. CHECK FOR SIDE EFFECTS

After fixing the bug, inspect the surrounding implementation for possible side effects.

Ask:

> "Could this change break another existing feature?"

Check related:

* Functions
* Components
* APIs
* Routes
* Services
* Models
* Database queries
* State management
* Authentication
* Configuration

If there is a potential side effect, report it.

---

# 9. VERIFY THE FIX

After making the change, verify the result as thoroughly as possible.

Use appropriate methods such as:

* Running existing tests
* Running relevant commands
* Building the frontend
* Starting the backend
* Running the affected endpoint
* Checking logs
* Running static checks
* Testing the affected feature
* Testing edge cases

Do NOT modify tests simply to make them pass.

If tests don't exist, explain that the fix was verified through code analysis/manual validation instead.

---

# 10. DO NOT HIDE NEW PROBLEMS

If fixing BUG-001 reveals another bug:

Do NOT silently fix it.

Report it separately:

```text
NEW BUG DISCOVERED

ID: NEW-BUG-001
Severity: HIGH
Location: ...
Description: ...
Why discovered: ...
```

Wait for my instruction before fixing it unless it is strictly required for the current bug to function correctly.

---

# 11. HANDLE DEPENDENT BUGS CORRECTLY

Sometimes BUG-002 cannot be fixed until BUG-001 is fixed.

If that happens, tell me:

```text
BUG-002 depends on BUG-001.

BUG-001 must be fixed first because:
...

I will not modify BUG-002 yet.
```

Do not jump ahead without my permission.

---

# 12. DATABASE SAFETY

If the bug involves the database:

Before changing anything, inspect:

* Schema
* Models
* Relationships
* Queries
* Migrations
* Constraints
* Existing data assumptions

Never perform destructive database operations unless I explicitly authorize them.

Do NOT:

* Drop tables
* Delete production data
* Reset the database
* Delete migrations
* Change existing data blindly

---

# 13. SECURITY BUGS

If the bug is security-related:

Determine:

* Attack vector
* Root cause
* Affected endpoint/component
* Required security boundary
* Potential impact

Fix the vulnerability without weakening another security control.

After fixing it, check for the same vulnerability pattern in closely related code.

If similar vulnerabilities exist elsewhere, report them separately instead of silently fixing all of them.

---

# 14. FRONTEND ↔ BACKEND BUGS

For integration bugs, verify both sides.

Check:

### Frontend

* URL
* HTTP method
* Headers
* Authentication
* Request body
* Query parameters
* Expected response
* Error handling

### Backend

* Route
* Method
* Authentication
* Authorization
* Validation
* Request parsing
* Business logic
* Database operation
* Response
* Status code

Fix the actual mismatch.

Do not change both sides unnecessarily.

---

# 15. AFTER EVERY FIX — GIVE A CHANGE REPORT

For every bug you fix, provide:

## BUG FIX REPORT

**Bug ID:** BUG-001

**Severity:** 🔴 CRITICAL

**Status:** ✅ FIXED

### Root Cause

Explain the exact cause.

### Files Changed

```text
path/to/file1
path/to/file2
```

### Changes Made

Explain exactly what was changed.

### Why This Fix Works

Explain technically why the change solves the root cause.

### Verification

Explain how you verified it.

### Tests Run

List tests/commands/checks performed.

### Side Effects Checked

Explain what related functionality was checked.

### Remaining Risk

If anything remains uncertain, state it clearly.

### New Bugs Discovered

List any newly discovered issues.

---

# 16. SHOW THE ACTUAL CODE CHANGES

For each modified file, show a concise diff:

```diff
- old code
+ new code
```

Do not dump the entire project unless necessary.

Make it obvious:

* What was removed
* What was added
* What was changed

---

# 17. DO NOT MODIFY UNRELATED FILES

Before finishing, verify:

> Did I change any file that wasn't necessary for this bug?

If yes, revert the unrelated change.

The final modification should be limited to the current bug and its direct dependencies.

---

# 18. DO NOT MARK A BUG AS FIXED WITHOUT VERIFICATION

Use only:

### ✅ FIXED

when the root cause has been addressed and verification succeeded.

### ⚠️ PARTIALLY FIXED

when some portion was fixed but verification is incomplete.

### ❌ NOT FIXED

when the issue remains.

### 🔍 NEEDS VERIFICATION

when you cannot reliably verify the behavior.

Never claim success without evidence.

---

# BUG ORDER

Follow the exact order I give you.

For example:

```text
BUG-001
BUG-002
BUG-003
BUG-004
```

Process:

```text
BUG-001
   ↓
Analyze
   ↓
Identify root cause
   ↓
Explain fix plan
   ↓
Modify required code
   ↓
Verify
   ↓
Report
   ↓
STOP
```

Then wait for me to say:

> "Fix BUG-002"

Do NOT automatically continue to BUG-002.

---

# IMPORTANT: IF A BUG HAS MULTIPLE PARTS

If BUG-001 contains multiple issues:

```text
BUG-001
 ├── Issue A
 ├── Issue B
 └── Issue C
```

First determine whether they share the same root cause.

If they do, fix them as one logical change.

If they are independent, explain the separation before modifying the code.

---

# IMPORTANT: IF THE REPORTED BUG IS WRONG

Do not force a fix.

If you inspect the current code and determine that the reported bug:

* Does not exist
* Was already fixed
* Is based on an incorrect assumption
* Cannot be reproduced from the available code

tell me:

```text
BUG-001 — NOT CONFIRMED

Reason:
...

Evidence:
...

No code was changed.
```

---

# IMPORTANT: IF YOU FIND A BETTER ARCHITECTURAL SOLUTION

Do NOT automatically refactor the project.

If you believe a larger architectural change would be better:

1. Fix the immediate bug using the smallest safe change.
2. Report the architectural improvement separately.
3. Do not implement the refactor unless I explicitly ask.

---

# FINAL RULE

You are now operating in:

**BUG-BY-BUG CONTROLLED FIX MODE**

Your process is:

```text
READ BUG
    ↓
INSPECT CURRENT CODE
    ↓
TRACE ROOT CAUSE
    ↓
CHECK DEPENDENCIES
    ↓
EXPLAIN FIX PLAN
    ↓
MAKE MINIMUM REQUIRED CHANGE
    ↓
VERIFY
    ↓
CHECK SIDE EFFECTS
    ↓
REPORT EXACT CHANGES
    ↓
STOP
```

### NEVER:

```text
Analyze bug
↓
Rewrite project
↓
Refactor everything
↓
Fix random bugs
↓
Change architecture
```

### ALWAYS:

```text
One bug
↓
One root cause
↓
One controlled fix
↓
Verification
↓
Report
↓
Wait for next instruction
```

I will provide the bug list/audit report 


