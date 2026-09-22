import * as vscode from 'vscode';

import { ReviewResult } from '../ai/types.js';

import {
    ComparisonResult
} from '../ai/compare.js';


export interface ReviewerDisplay {
    name: string;
    status: 'success' | 'failed';
    review?: ReviewResult;
    error?: string;
}


export function showReviewPanel(
    context: vscode.ExtensionContext,
    reviewers: ReviewerDisplay[],
    comparison: ComparisonResult,
    documentUri: vscode.Uri,
    selectionRange: vscode.Range
) {

    const panel =
        vscode.window.createWebviewPanel(
            'ashenAuditReview',
            'AshenAudit Review',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );


    panel.webview.html =
        getWebviewContent(
            reviewers,
            comparison
        );


    panel.webview.onDidReceiveMessage(
        async message => {

            if (message.command === 'copyCode') {

                try {

                    await vscode.env.clipboard.writeText(
                        comparison.correctedCode
                    );

                    vscode.window.showInformationMessage(
                        'AshenAudit: Corrected code copied to clipboard.'
                    );

                } catch (error) {

                    const errorMessage =
                        error instanceof Error
                            ? error.message
                            : String(error);

                    vscode.window.showErrorMessage(
                        `AshenAudit: Could not copy code. ${errorMessage}`
                    );
                }

            }


            if (message.command === 'applyFix') {

                if (
                    !comparison.correctedCode ||
                    !comparison.correctedCode.trim()
                ) {

                    vscode.window.showWarningMessage(
                        'AshenAudit: No corrected code is available.'
                    );

                    return;
                }


                try {

                    const document =
                        await vscode.workspace.openTextDocument(
                            documentUri
                        );


                    const editor =
                        await vscode.window.showTextDocument(
                            document,
                            {
                                viewColumn:
                                    vscode.ViewColumn.One,
                                preserveFocus: true
                            }
                        );


                    const success =
                        await editor.edit(
                            editBuilder => {

                                editBuilder.replace(
                                    selectionRange,
                                    comparison.correctedCode
                                );

                            }
                        );


                    if (success) {

                        vscode.window.showInformationMessage(
                            'AshenAudit: Corrected code applied.'
                        );

                    } else {

                        vscode.window.showErrorMessage(
                            'AshenAudit: Could not apply the correction.'
                        );
                    }

                } catch (error) {

                    const errorMessage =
                        error instanceof Error
                            ? error.message
                            : String(error);

                    vscode.window.showErrorMessage(
                        `AshenAudit: Failed to apply fix. ${errorMessage}`
                    );
                }
            }

        },

        undefined,

        context.subscriptions
    );
}


function getWebviewContent(
    reviewers: ReviewerDisplay[],
    comparison: ComparisonResult
): string {


    const reviewerHtml =
        reviewers.map(
            reviewer => {

                if (
                    reviewer.status ===
                    'failed'
                ) {

                    return `
                        <div class="reviewer failed">

                            <div class="reviewer-header">

                                <h3>
                                    ${escapeHtml(
                                        reviewer.name
                                    )}
                                </h3>

                                <span class="status failed-status">
                                    FAILED
                                </span>

                            </div>

                            <p class="error">
                                ${escapeHtml(
                                    reviewer.error ??
                                    'Unknown error'
                                )}
                            </p>

                        </div>
                    `;
                }


                const review =
                    reviewer.review!;


                const issuesHtml =
                    review.issues.length === 0
                        ? `
                            <li>
                                No issues found.
                            </li>
                        `
                        : review.issues
                            .map(
                                issue =>
                                    `<li>${escapeHtml(issue)}</li>`
                            )
                            .join('');


                return `
                    <div class="reviewer">

                        <div class="reviewer-header">

                            <h3>
                                ${escapeHtml(
                                    reviewer.name
                                )}
                            </h3>

                            <span class="status success-status">
                                SUCCESS
                            </span>

                        </div>


                        <div class="review-grid">

                            <div class="info-box">

                                <span class="label">
                                    Verdict
                                </span>

                                <span class="value">
                                    ${escapeHtml(
                                        review.verdict
                                    )}
                                </span>

                            </div>


                            <div class="info-box">

                                <span class="label">
                                    Confidence
                                </span>

                                <span class="value">
                                    ${review.confidence.toFixed(2)}
                                </span>

                            </div>

                        </div>


                        <h4>
                            Issues
                        </h4>

                        <ul>
                            ${issuesHtml}
                        </ul>


                        <h4>
                            Reasoning
                        </h4>

                        <p class="reasoning">
                            ${escapeHtml(
                                review.reasoning
                            )}
                        </p>

                    </div>
                `;
            }
        ).join('');


    const combinedIssues =
        comparison.issues.length === 0
            ? `
                <li>
                    No issues found.
                </li>
            `
            : comparison.issues
                .map(
                    issue =>
                        `<li>${escapeHtml(issue)}</li>`
                )
                .join('');


    let correctedCodeSection = '';


    if (
        comparison.correctedCode &&
        comparison.correctedCode.trim()
    ) {

        correctedCodeSection = `

            <section class="code-section">

                <div class="code-header">

                    <h2>
                        Corrected Code
                    </h2>


                    <div class="buttons">

                        <button
                            id="copyCode"
                            class="secondary-button"
                        >
                            Copy Code
                        </button>


                        <button
                            id="applyFix"
                            class="primary-button"
                        >
                            Apply Fix
                        </button>

                    </div>

                </div>


                <pre><code>${escapeHtml(
                    comparison.correctedCode
                )}</code></pre>

            </section>

        `;

    } else {

        correctedCodeSection = `

            <section class="code-section">

                <div class="code-header">

                    <h2>
                        Corrected Code
                    </h2>

                </div>

                <p class="muted">
                    No corrected code was provided.
                </p>

            </section>

        `;
    }


    return `

<!DOCTYPE html>

<html lang="en">

<head>

    <meta charset="UTF-8">


    <meta
        http-equiv="Content-Security-Policy"
        content="
            default-src 'none';
            style-src 'unsafe-inline';
            script-src 'unsafe-inline';
        "
    >


    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >


    <title>
        AshenAudit Review
    </title>


    <style>

        * {
            box-sizing: border-box;
        }


        body {

            padding: 24px;

            font-family:
                -apple-system,
                BlinkMacSystemFont,
                'Segoe UI',
                sans-serif;

            color:
                var(--vscode-foreground);

            background:
                var(--vscode-editor-background);

        }


        h1 {

            margin-top: 0;
            margin-bottom: 6px;

        }


        h2 {

            margin-top: 0;

        }


        h3 {

            margin: 0;

        }


        h4 {

            margin-bottom: 8px;

        }


        .subtitle {

            color:
                var(--vscode-descriptionForeground);

            margin-bottom: 24px;

        }


        .summary {

            border:
                1px solid
                var(--vscode-panel-border);

            border-radius: 8px;

            padding: 20px;

            margin-bottom: 24px;

        }


        .summary-grid {

            display: grid;

            grid-template-columns:
                repeat(
                    auto-fit,
                    minmax(150px, 1fr)
                );

            gap: 12px;

        }


        .info-box {

            padding: 12px;

            background:
                var(
                    --vscode-textCodeBlock-background
                );

            border-radius: 6px;

        }


        .label {

            display: block;

            font-size: 12px;

            color:
                var(
                    --vscode-descriptionForeground
                );

            margin-bottom: 5px;

        }


        .value {

            font-weight: 600;

        }


        .reviewer {

            border:
                1px solid
                var(--vscode-panel-border);

            border-radius: 8px;

            padding: 18px;

            margin-bottom: 16px;

        }


        .failed {

            opacity: 0.85;

        }


        .reviewer-header {

            display: flex;

            justify-content: space-between;

            align-items: center;

            gap: 12px;

            margin-bottom: 16px;

        }


        .status {

            display: inline-block;

            padding: 4px 8px;

            border-radius: 4px;

            font-size: 11px;

            font-weight: 700;

        }


        .success-status {

            background: #1f6f43;

            color: white;

        }


        .failed-status {

            background: #8b3030;

            color: white;

        }


        .review-grid {

            display: grid;

            grid-template-columns:
                repeat(
                    auto-fit,
                    minmax(150px, 1fr)
                );

            gap: 12px;

            margin-bottom: 16px;

        }


        ul {

            padding-left: 22px;

        }


        li {

            margin-bottom: 7px;

        }


        .reasoning {

            line-height: 1.5;

        }


        .error {

            color:
                var(--vscode-errorForeground);

        }


        .issues {

            border:
                1px solid
                var(--vscode-panel-border);

            border-radius: 8px;

            padding: 18px;

            margin-bottom: 24px;

        }


        .code-section {

            border:
                1px solid
                var(--vscode-panel-border);

            border-radius: 8px;

            overflow: hidden;

            margin-bottom: 24px;

        }


        .code-header {

            display: flex;

            justify-content: space-between;

            align-items: center;

            gap: 12px;

            padding: 14px 18px;

            border-bottom:
                1px solid
                var(--vscode-panel-border);

        }


        .code-header h2 {

            margin: 0;

        }


        .buttons {

            display: flex;

            gap: 8px;

        }


        button {

            border: none;

            border-radius: 5px;

            padding: 8px 14px;

            cursor: pointer;

            font-weight: 600;

        }


        .primary-button {

            background:
                var(--vscode-button-background);

            color:
                var(--vscode-button-foreground);

        }


        .primary-button:hover {

            background:
                var(--vscode-button-hoverBackground);

        }


        .secondary-button {

            background:
                var(
                    --vscode-textCodeBlock-background
                );

            color:
                var(--vscode-foreground);

            border:
                1px solid
                var(--vscode-panel-border);

        }


        .secondary-button:hover {

            background:
                var(
                    --vscode-list-hoverBackground
                );

        }


        pre {

            margin: 0;

            padding: 18px;

            overflow-x: auto;

            background:
                var(
                    --vscode-textCodeBlock-background
                );

        }


        code {

            font-family:
                'Cascadia Code',
                'Fira Code',
                Consolas,
                monospace;

            font-size: 13px;

            line-height: 1.5;

        }


        .muted {

            color:
                var(
                    --vscode-descriptionForeground
                );

            padding: 0 18px 18px;

        }

    </style>

</head>


<body>


    <h1>
        AshenAudit Review
    </h1>


    <div class="subtitle">

        AI-assisted code verification and review

    </div>


    <section class="summary">

        <h2>
            Final Result
        </h2>


        <div class="summary-grid">


            <div class="info-box">

                <span class="label">
                    Status
                </span>

                <span class="value">
                    ${escapeHtml(
                        comparison.status
                    )}
                </span>

            </div>


            <div class="info-box">

                <span class="label">
                    Verdict
                </span>

                <span class="value">
                    ${escapeHtml(
                        comparison.verdict
                    )}
                </span>

            </div>


            <div class="info-box">

                <span class="label">
                    Confidence
                </span>

                <span class="value">
                    ${comparison.confidence.toFixed(2)}
                </span>

            </div>


            <div class="info-box">

                <span class="label">
                    Reviewers Used
                </span>

                <span class="value">
                    ${comparison.reviewersUsed}
                </span>

            </div>

        </div>


        <h4>
            Explanation
        </h4>


        <p>
            ${escapeHtml(
                comparison.explanation
            )}
        </p>

    </section>


    <section class="issues">

        <h2>
            Combined Issues
        </h2>


        <ul>
            ${combinedIssues}
        </ul>

    </section>


    <section>

        <h2>
            Individual Reviews
        </h2>

        ${reviewerHtml}

    </section>


    ${correctedCodeSection}


    <script>

        const vscode =
            acquireVsCodeApi();


        const copyButton =
            document.getElementById(
                'copyCode'
            );


        if (copyButton) {

            copyButton.addEventListener(
                'click',
                () => {

                    vscode.postMessage({

                        command:
                            'copyCode'

                    });

                }
            );

        }


        const applyButton =
            document.getElementById(
                'applyFix'
            );


        if (applyButton) {

            applyButton.addEventListener(
                'click',
                () => {

                    vscode.postMessage({

                        command:
                            'applyFix'

                    });

                }
            );

        }

    </script>


</body>

</html>

`;
}


function escapeHtml(
    value: string
): string {

    return value
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#039;'
        );
}