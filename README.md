# AshenAudit

AI-assisted code verification, review, and repair directly inside Visual Studio Code.

AshenAudit analyzes selected code using multiple specialized AI reviewers, compares their findings, optionally retrieves external technical evidence, and generates a corrected version of the code.

---

## Features

### Multi-Agent Code Review

AshenAudit uses specialized AI reviewers to analyze different aspects of the selected code.

- **Triage** — syntax errors, obvious bugs, malformed code, and invalid usage
- **Architecture** — structure, dependencies, API integration, and design issues
- **Logic** — control flow, data flow, algorithms, edge cases, and runtime logic
- **Security** — potential security vulnerabilities and unsafe practices

Each reviewer has a specific responsibility instead of asking a single AI model to analyze everything.

---

### Multiple AI Providers

AshenAudit supports multiple AI providers:

- Google Gemini
- Groq
- OpenAI

Provider fallback allows the review process to continue when an individual provider or model is unavailable.

---

### Reviewer Comparison

After the specialized reviewers finish, AshenAudit compares their results.

The comparison provides:

- Overall verdict
- Reviewer agreement or disagreement
- Confidence
- Combined issues
- Reviewer count
- Corrected code when available

Possible verdicts include:

- `pass`
- `issues_found`
- `uncertain`

When specialized technical reviewers agree on an issue, their findings can be carried into the final verification stage.

---

### External Technical Evidence

When reviewer findings require additional verification, AshenAudit can use **SerpApi** to search for external technical information.

The resulting evidence is displayed in the review panel, including:

- Search result title
- Source link
- Relevant snippet

This provides an additional evidence layer when AI reviewers disagree or require external technical context.

---

### Final Verification and Code Repair

After the initial review, AshenAudit runs a final verification and repair stage.

The final reviewer receives:

- Original source code
- Specialized reviewer findings
- External technical evidence when available

It independently evaluates the findings and generates the final result.

If genuine problems are found, AshenAudit generates the **complete corrected source code** rather than only returning individual changes.

---

### Copy and Apply Fix

Once corrected code is generated, the developer can choose:

**Copy Code**

Copies the corrected source code to the clipboard.

**Apply Fix**

Replaces the originally selected code directly with the generated correction.

The developer remains in control of whether the generated correction is applied.

---

### Terminal Verification Logs

AshenAudit provides a detailed verification trace in the VS Code Extension Host terminal.

The terminal can show:

- Verification start
- Specialized reviewer execution
- Provider and model used
- Reviewer verdict
- Reviewer confidence
- Detected issues
- Reviewer reasoning
- Combined result
- External evidence search
- Final synthesis result
- Generated corrected code status
- Local validation status

This provides a transparent execution trace while AshenAudit performs the verification.

---

### Review Panel

AshenAudit also provides a dedicated review panel inside VS Code.

The panel displays:

- Specialized reviewer results
- Provider and model information
- Reviewer verdicts
- Confidence levels
- Detected issues
- Reviewer reasoning
- Combined result
- External technical evidence
- Final corrected code
- Copy Code action
- Apply Fix action

---

### Optional Local Validation

AshenAudit can optionally use locally installed compilers or interpreters for an additional validation layer.

Examples include:

| Language | Possible Validator |
|---|---|
| C++ | g++, Clang++, MSVC |
| C | gcc, Clang |
| JavaScript | Node.js |
| TypeScript | TypeScript compiler |
| Python | Python |
| Java | javac |

Local validation is optional.

If no supported compiler or interpreter is available, AshenAudit continues with AI-based verification and reports that local validation is unavailable.

AshenAudit does not bundle compilers with the extension.

---

## How It Works

```text
                    Selected Code
                         │
                         ▼
              ┌─────────────────────┐
              │  Specialized AI     │
              │      Reviewers       │
              └──────────┬──────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       Triage       Architecture      Logic
          │              │              │
          └──────────────┼──────────────┘
                         │
                    Security
                         │
                         ▼
              Reviewer Comparison
                         │
                ┌────────┴────────┐
                │                 │
             Agreement       Disagreement
                │                 │
                │                 ▼
                │        SerpApi Evidence
                │                 │
                └────────┬────────┘
                         ▼
                Final Verification
                         │
                         ▼
                  Code Repair
                         │
                         ▼
                Corrected Source Code
                         │
                 ┌───────┴───────┐
                 ▼               ▼
             Copy Code       Apply Fix