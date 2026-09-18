---
trigger: always_on
---

PHASE 1 — DEEPLY ANALYZE THE ENTIRE PROJECT

DO NOT modify, edit, delete, rename, move, or generate any project files during this phase.

Before doing anything related to my requested task, thoroughly inspect the complete project.

1. Analyze the complete directory structure

Inspect:

Every folder
Every subfolder
Every source file
Every configuration file
Every dependency file
Every environment/configuration file that is safe to inspect
Every frontend file
Every backend file
Every API-related file
Every database-related file
Every model/schema
Every service
Every utility/helper
Every middleware
Every route
Every controller
Every component
Every page
Every hook
Every state-management file
Every authentication/authorization mechanism
Every integration
Every script
Every test
Every documentation file

Do not assume that a file is irrelevant just because its name looks unimportant.

Create a mental map of the entire project.

2. Analyze every file deeply

For each relevant file, determine:

What the file does
Why the file exists
What functionality it provides
What other files it depends on
Which files depend on it
Functions/classes/components defined inside it
Inputs and outputs
Important variables and data structures
API calls
Database operations
Authentication/authorization logic
Error handling
Validation
State management
Side effects
External dependencies
Configuration dependencies
Environment variables
Potential edge cases
Potential bugs
Potential security issues
Potential performance problems

Do not merely summarize filenames.

Understand how the actual code works.

3. Analyze the code line by line

For important source files, inspect the code line by line and logically trace what each section is doing.

Pay particular attention to:

Control flow
Function calls
Data flow
Request → backend → database → response flow
Frontend → API communication
Authentication flow
Authorization flow
Error propagation
State updates
Component lifecycle
Async operations
Database queries
API endpoints
Validation
File uploads/downloads
External services
AI/ML integrations
Caching
Background jobs
WebSockets/events if present

Do not claim to have analyzed a line if you have not actually inspected it.

If the project is too large to analyze in one pass, analyze it systematically in multiple passes until the complete project has been covered.

4. Understand the architecture

After inspecting the files, reconstruct the complete architecture.

Explain internally how:

User
 ↓
Frontend
 ↓
Frontend Logic / State
 ↓
API Request
 ↓
Backend Route
 ↓
Controller / Service
 ↓
Business Logic
 ↓
Database / External Service
 ↓
Backend Response
 ↓
Frontend
 ↓
UI

actually works in THIS project.

Do not assume the architecture follows this exact structure.

Determine the real architecture from the code.

5. Trace every major feature

For every major feature in the project, trace the complete implementation.

For example:

Feature
 ↓
Frontend UI
 ↓
Component
 ↓
Handler
 ↓
API call
 ↓
Backend route
 ↓
Controller
 ↓
Service
 ↓
Database
 ↓
Response
 ↓
Frontend state
 ↓
UI update

Identify:

Where the feature starts
Every file involved
Every function involved
Every API involved
Every database operation involved
What happens on success
What happens on failure
Missing connections
Incomplete implementation
Dead/unreachable code
Features implemented in backend but not connected to frontend
Features implemented in frontend but unsupported by backend
6. Understand the intended functionality

Read all available documentation and project-related files.

Pay special attention to:

README
Problem statement
Requirements
Documentation
Comments
TODOs
Configuration
Existing API documentation
Database schemas
Any provided specification

Compare the intended functionality with the actual implementation.

Create a clear understanding of:

Expected

What the project is supposed to do.

Actual

What the current code actually does.

Gap

What is missing, incorrect, incomplete, disconnected, or inconsistent.

7. Find bugs BEFORE making changes

Perform a comprehensive audit.

Look for:

Functional bugs
Incorrect logic
Wrong conditions
Incorrect API calls
Incorrect parameters
Incorrect responses
Missing functionality
Broken workflows
Integration bugs
Frontend/backend mismatch
Wrong endpoint
Wrong HTTP method
Wrong request body
Wrong response format
Missing API integration
Backend feature not connected to frontend
Database bugs
Incorrect schema usage
Incorrect queries
Missing relationships
Incorrect field names
Data consistency issues
Authentication/security bugs
Missing authentication
Incorrect authorization
Token problems
Exposed secrets
Unsafe input handling
Injection vulnerabilities
Insecure API endpoints
Sensitive data exposure
Frontend bugs
Broken components
Incorrect state updates
Race conditions
Incorrect rendering
Missing loading/error states
Incorrect routing
Backend bugs
Incorrect route handling
Incorrect async handling
Missing validation
Poor error handling
Incorrect status codes
Unhandled exceptions
Performance bugs
Unnecessary API requests
Excessive database queries
Memory issues
Inefficient algorithms
Unnecessary rendering
Configuration/deployment bugs
Environment variable problems
Incorrect ports
CORS issues
Build problems
Deployment incompatibilities  PHASE 3 — ONLY AFTER COMPLETE UNDERSTANDING, EXECUTE MY TASK

Once you have thoroughly analyzed the project and understand its architecture, functionality, dependencies, data flow, and existing problems, then—and only then—perform the task I provided at the beginning.

My task is:

[PASTE MY TASK HERE]

Before modifying anything, determine:

Which files need to change
Why each file needs to change
What existing functionality could be affected
What dependencies exist between the files
Whether the requested change conflicts with existing functionality
Whether the backend and frontend both need changes
Whether database/schema changes are required
Whether API changes are required
Whether existing tests need modification/addition

Do not blindly implement the task.

Use your understanding of the complete project to implement it correctly.

PHASE 4 — IMPLEMENT CAREFULLY

When making changes:

Preserve existing working functionality
Do not unnecessarily rewrite working code
Do not introduce duplicate functionality
Follow the project's existing architecture and coding conventions
Reuse existing utilities/components/services where appropriate
Maintain compatibility between frontend and backend
Maintain API contracts unless the task requires changing them
Handle errors properly
Handle edge cases
Do not hardcode secrets
Do not remove functionality without a reason
Do not create unnecessary files
Do not change unrelated code

If you discover an existing bug that directly affects my requested task, fix it if necessary.

If you discover an unrelated bug, do not silently change it. Report it separately.

PHASE 5 — VERIFY EVERYTHING

After implementation, perform another complete consistency check.

Verify:

Frontend
Components
Pages
Routing
State
API calls
Error handling
UI behavior
Backend
Routes
Controllers
Services
Validation
Authentication
Error handling
Database
Queries
Schema
Relationships
Data integrity
Integration
Frontend ↔ Backend
Backend ↔ Database
Backend ↔ External services
Authentication flow
Build/runtime

Check for:

Syntax errors
Import errors
Type errors
Missing dependencies
Broken routes
Incorrect environment variables
Runtime errors
Build errors

Run the appropriate tests, linting, type checking, and build commands available in the project.

Do not claim something works unless you actually verified it.  