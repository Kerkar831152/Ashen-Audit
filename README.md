# AshenAudit

**AI-assisted code verification, review, and correction inside VS Code.**

AshenAudit analyzes selected code using multiple independent AI reviewers, compares their findings, gathers external technical evidence when required, and produces a final review with corrected code.

Built by **Vithal Kerkar**.

---

## Overview

AI-generated code can look correct while containing logical, architectural, security, or implementation problems.

AshenAudit provides an additional verification layer directly inside VS Code.

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

Each reviewer produces structured results containing:

* Verdict
* Confidence
* Issues
* Reasoning
* Corrected code

---

### Provider Fallback

AshenAudit can use multiple AI providers and configured models.

If one provider or model fails or becomes unavailable, the verification pipeline can continue using other available reviewers instead of stopping completely.

This helps the system remain functional during provider errors, quota limits, or temporary availability issues.

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

This allows uncertain or disputed findings to be investigated using documentation and other technical references.

External search acts as supporting evidence rather than replacing the AI review process.

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

The review panel provides two actions.

**Copy Code**

Copies the generated corrected code to the clipboard.

**Apply Fix**

Replaces the originally selected code with the generated corrected version directly in VS Code.

---

### Terminal / Output Logging

AshenAudit reports its verification progress through the VS Code output environment.

The logs can show stages such as:

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

This makes the verification pipeline visible instead of hiding the entire process behind the UI.

---

### Local Validation

When a supported compiler or interpreter is available on the system, AshenAudit can attempt local validation of the generated code.

For example, C++ validation can use an installed compiler such as:

* `g++`
* `clang++`
* Microsoft C++ compiler

If no supported compiler or interpreter is available, AshenAudit continues without local validation and reports that validation is unavailable.

Local validation is an additional verification layer and does not replace the AI review.

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

## Configuration

AshenAudit currently uses API credentials for its AI providers and external search functionality.

During development and local testing, credentials are configured through environment variables:

```text
GEMINI_API_KEY=your_key
GROQ_API_KEY=your_key
OPENAI_API_KEY=your_key
SERPAPI_KEY=your_key
```

API credentials are **not included in the extension package** and should never be committed to the repository.

The `.env` file used during development is excluded from the packaged VSIX.

### API Providers

AshenAudit currently supports AI review through configured providers including:

* Google Gemini
* Groq
* OpenAI

SerpApi is used for optional external technical evidence.

> Users should use their own API credentials and follow the terms and usage limits of the respective providers.

---

## Requirements

For development or local configuration:

* VS Code
* Node.js
* npm
* API credentials for the configured AI providers
* SerpApi API key for external search functionality
* An installed compiler/interpreter for optional local validation

Local compiler/interpreter validation is optional.

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

## Security & API Keys

**Never commit API keys to GitHub or include them in a public extension package.**

Keep local credentials in your `.env` file and make sure the file remains excluded from Git.

AshenAudit does not include the developer's API credentials in the published VSIX.

---

## Current Limitations

* Review quality depends on the configured AI models and providers.
* AI providers may experience rate limits, outages, or quota restrictions.
* External evidence depends on SerpApi availability and search results.
* Local validation requires a supported compiler or interpreter to already be installed.
* API credentials currently require local configuration.
* Different programming languages require different local validation tools.

---

## Project Status

**Current Version:** `0.0.2`

AshenAudit is an actively developed VS Code extension focused on multi-reviewer AI code verification, reviewer comparison, external technical evidence, final code correction, and optional local validation.

The project is still evolving, and future versions may expand language support, validation capabilities, reviewer strategies, and configuration options.

---

## License

AshenAudit is licensed under the MIT License.

See the [LICENSE](LICENSE) file for details.
