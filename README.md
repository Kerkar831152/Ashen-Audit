# AshenAudit

**AI-assisted code verification, review, and correction inside VS Code.**

AshenAudit analyzes selected code using multiple independent AI reviewers, compares their findings, gathers external technical evidence when required, and produces a final review with corrected code.

Built by **Vithal Kerkar**.

---

## Overview

AI-generated code can look correct while containing logical, architectural, security, or implementation problems.

AshenAudit is designed to provide an additional verification layer directly inside VS Code.

Instead of relying on a single AI response, AshenAudit uses multiple specialized reviewers and combines their findings before producing a final result.

### Workflow

```text
Select Code
     ↓
Specialized AI Reviewers
     ↓
Reviewer Comparison
     ↓
External Technical Evidence (when needed)
     ↓
Final Synthesis & Code Correction
     ↓
Local Validation (when available)
     ↓
Review Panel + Terminal Output
```

---

## Features

### Multiple Specialized Reviewers

AshenAudit assigns different review responsibilities to AI reviewers:

* **Triage** — identifies obvious correctness and implementation problems.
* **Architecture** — examines structure, design, maintainability, and implementation choices.
* **Logic** — checks program behavior, edge cases, and logical correctness.
* **Security** — looks for security-related weaknesses and unsafe patterns.

Each reviewer produces a structured result containing:

* Verdict
* Confidence
* Issues
* Reasoning
* Corrected code

---

### Reviewer Fallback

AshenAudit can use multiple AI providers and fallback models.

If one configured reviewer fails or becomes unavailable, the system can attempt another configured provider/model rather than stopping the entire verification process.

This helps the verification pipeline remain functional when an individual model or provider is unavailable.

---

### Consensus-Based Review

Reviewer results are compared before producing the final result.

AshenAudit distinguishes between:

* Agreement between technical reviewers
* Disagreement between reviewers
* Insufficient reviewer results
* Security-specific findings

This prevents a single AI response from automatically becoming the final answer.

---

### External Technical Evidence

When additional evidence is useful, AshenAudit can use **SerpApi** to search external technical sources.

This allows disputed or uncertain findings to be investigated using documentation and other technical references.

External search is used as supporting evidence rather than replacing the AI review process.

---

### Final Code Correction

After the review stage, a final synthesis step analyzes the collected findings and produces:

* Final verdict
* Final confidence
* Consolidated issues
* Corrected code

The goal is not only to identify problems but also to provide a usable corrected version of the selected code.

---

### Copy Code & Apply Fix

The review panel provides two actions:

**Copy Code**

Copies the generated corrected code to the clipboard.

**Apply Fix**

Replaces the originally selected code directly with the generated corrected version.

---

### Terminal / Output Logging

AshenAudit also reports its verification progress through the VS Code terminal/output environment.

The logs can show information such as:

```text
TRIAGE
ARCHITECTURE
LOGIC
SECURITY

COMBINED RESULT

FINAL SYNTHESIS

LOCAL VALIDATION

FINAL RESULT
```

This makes the verification pipeline visible instead of hiding the process entirely behind the UI.

---

### Local Validation

When a supported compiler/interpreter is available on the system, AshenAudit can attempt local validation of the generated code.

For example, C++ validation can use an installed compiler such as:

* `g++`
* `clang++`
* Microsoft C++ compiler

If no supported compiler/interpreter is available, AshenAudit continues without local validation and reports that validation is unavailable.

---

## How to Use

### 1. Select Code

Open a source file in VS Code and select the code you want to verify.

### 2. Run AshenAudit

Open the Command Palette:

```text
Ctrl + Shift + P
```

Run:

```text
AshenAudit: Verify Selected Code
```

### 3. Review the Results

AshenAudit runs the configured reviewers and displays their results in the review panel.

You can inspect:

* Individual reviewer findings
* Reviewer agreement
* Confidence
* External evidence
* Final issues
* Corrected code
* Local validation status

### 4. Apply or Copy the Correction

Use:

```text
Copy Code
```

or:

```text
Apply Fix
```

to use the generated correction.

---

## Requirements

For development and local configuration:

* VS Code
* Node.js
* npm
* Configured AI provider API keys
* SerpApi API key for external search functionality
* An installed compiler/interpreter for optional local validation

Local validation is optional.

---

## Configuration

AshenAudit currently uses environment variables for API credentials during development.

Example:

```text
GEMINI_API_KEY=your_key
GROQ_API_KEY=your_key
OPENAI_API_KEY=your_key
SERPAPI_KEY=your_key
```

**Never commit API keys to GitHub or include them in a public extension package.**

The `.env` file used during development is excluded from the packaged VSIX.

---

## Architecture

```text
VS Code Extension
       │
       ├── Code Selection
       │
       ├── Specialized Reviewers
       │      ├── Triage
       │      ├── Architecture
       │      ├── Logic
       │      └── Security
       │
       ├── Provider Fallback
       │
       ├── Review Comparison
       │
       ├── SerpApi Evidence
       │
       ├── Final Synthesis
       │
       ├── Local Validation
       │
       └── Review Panel
```

---

## Current Limitations

* Review quality depends on the configured AI models and providers.
* AI providers may experience rate limits, outages, or quota restrictions.
* External evidence depends on SerpApi availability and search results.
* Local validation requires a supported compiler/interpreter to already be installed.
* API credentials currently require local configuration.
* Different programming languages require different local validation tools.

---

## Project Status

**Version:** `0.0.1`

AshenAudit is cu
