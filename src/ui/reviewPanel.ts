import * as vscode from 'vscode';

import {
    ReviewerDisplay
} from '../ai/types.js';

import {
    ComparisonResult
} from '../ai/compare.js';

import {
    SearchResult
} from '../ai/serpapi.js';


export function showReviewPanel(
    context: vscode.ExtensionContext,
    reviewers: ReviewerDisplay[],
    comparison: ComparisonResult,
    documentUri: vscode.Uri,
    selectionRange: vscode.Range,
    externalEvidence: SearchResult[] = []
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


    const nonce =
        getNonce();


    panel.webview.html =
        getWebviewContent(
            panel.webview,
            nonce,
            reviewers,
            comparison,
            externalEvidence
        );


    panel.webview.onDidReceiveMessage(
        async message => {

            if (
                message.command ===
                'copyCode'
            ) {

                const code =
                    typeof message.code === 'string'
                        ? message.code
                        : '';


                if (!code) {

                    vscode.window.showWarningMessage(
                        'AshenAudit: No corrected code available.'
                    );

                    return;
                }


                try {

                    await vscode.env.clipboard.writeText(
                        code
                    );


                    vscode.window.showInformationMessage(
                        'AshenAudit: Corrected code copied.'
                    );

                } catch (error) {

                    const errorMessage =
                        error instanceof Error
                            ? error.message
                            : String(error);


                    vscode.window.showErrorMessage(
                        `AshenAudit: Failed to copy code. ${errorMessage}`
                    );
                }


                return;
            }


            if (
                message.command ===
                'applyFix'
            ) {

                const code =
                    typeof message.code === 'string'
                        ? message.code
                        : '';


                if (!code) {

                    vscode.window.showWarningMessage(
                        'AshenAudit: No corrected code available.'
                    );

                    return;
                }


                const editor =
                    vscode.window.visibleTextEditors.find(
                        currentEditor =>
                            currentEditor.document.uri.toString() ===
                            documentUri.toString()
                    );


                if (!editor) {

                    vscode.window.showErrorMessage(
                        'AshenAudit: Original editor is no longer available.'
                    );

                    return;
                }


                try {

                    const success =
                        await editor.edit(
                            editBuilder => {

                                editBuilder.replace(
                                    selectionRange,
                                    code
                                );
                            }
                        );


                    if (!success) {

                        vscode.window.showErrorMessage(
                            'AshenAudit: VS Code could not apply the fix.'
                        );

                        return;
                    }


                    vscode.window.showInformationMessage(
                        'AshenAudit: Fix applied.'
                    );


                    panel.webview.postMessage({
                        command:
                            'fixApplied'
                    });

                } catch (error) {

                    const errorMessage =
                        error instanceof Error
                            ? error.message
                            : String(error);


                    vscode.window.showErrorMessage(
                        `AshenAudit: Failed to apply fix. ${errorMessage}`
                    );
                }


                return;
            }


            if (
                message.command ===
                'openExternal'
            ) {

                if (
                    typeof message.url ===
                    'string'
                ) {

                    try {

                        await vscode.env.openExternal(
                            vscode.Uri.parse(
                                message.url
                            )
                        );

                    } catch (error) {

                        const errorMessage =
                            error instanceof Error
                                ? error.message
                                : String(error);


                        vscode.window.showErrorMessage(
                            `AshenAudit: Failed to open link. ${errorMessage}`
                        );
                    }
                }


                return;
            }
        },
        undefined,
        context.subscriptions
    );
}


function getWebviewContent(
    webview: vscode.Webview,
    nonce: string,
    reviewers: ReviewerDisplay[],
    comparison: ComparisonResult,
    externalEvidence: SearchResult[]
): string {

    const reviewerSections =
        reviewers
            .map(
                reviewer =>
                    renderReviewer(
                        reviewer
                    )
            )
            .join('');


    const issues =
        comparison.issues.length > 0
            ? comparison.issues
                .map(
                    issue =>
                        `<li>${escapeHtml(cleanText(issue))}</li>`
                )
                .join('')
            : '<li>No combined issues.</li>';


    const correctedCode =
        typeof comparison.correctedCode === 'string'
            ? comparison.correctedCode
            : '';


    const evidenceSection =
        externalEvidence.length > 0
            ? `
                <section class="section">

                    <h2>
                        External Technical Evidence
                    </h2>

                    ${externalEvidence
                        .map(
                            result => `
                                <div class="evidence">

                                    <div class="evidence-title">

                                        <a
                                            href="#"
                                            class="external-link"
                                            data-url="${escapeAttribute(
                                                result.link
                                            )}"
                                        >
                                            ${escapeHtml(
                                                cleanText(
                                                    result.title
                                                )
                                            )}
                                        </a>

                                    </div>

                                    <p>
                                        ${escapeHtml(
                                            cleanText(
                                                result.snippet
                                            )
                                        )}
                                    </p>

                                </div>
                            `
                        )
                        .join('')}

                </section>
            `
            : '';


    const correctedCodeSection =
        correctedCode.trim()
            ? `
                <section class="section">

                    <h2>
                        Corrected Code
                    </h2>

                    <pre class="code">${escapeHtml(
                        correctedCode
                    )}</pre>

                    <div class="buttons">

                        <button
                            id="copyButton"
                        >
                            Copy Code
                        </button>

                        <button
                            id="applyButton"
                        >
                            Apply Fix
                        </button>

                    </div>

                </section>
            `
            : `
                <section class="section">

                    <h2>
                        Corrected Code
                    </h2>

                    <p>
                        No corrected code was produced.
                    </p>

                </section>
            `;


    const safeCorrectedCode =
        JSON.stringify(
            correctedCode
        )
        .replace(
            /</g,
            '\\u003c'
        )
        .replace(
            />/g,
            '\\u003e'
        )
        .replace(
            /&/g,
            '\\u0026'
        );


    return `
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
/>

<meta
    http-equiv="Content-Security-Policy"
    content="
        default-src 'none';
        style-src 'unsafe-inline';
        script-src 'nonce-${nonce}';
    "
>

<title>
    AshenAudit Review
</title>


<style>

body {

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

    padding: 24px;

    color:
        var(--vscode-foreground);

    background:
        var(--vscode-editor-background);

    line-height: 1.45;
}


h1 {
    margin-top: 0;
}


h2 {
    margin-bottom: 12px;
}


h3 {
    margin-bottom: 8px;
}


.section {
    margin-top: 24px;
}


.reviewer {

    border:
        1px solid
        var(--vscode-panel-border);

    border-radius: 8px;

    padding: 16px;

    margin-bottom: 12px;
}


.header {

    display: flex;

    justify-content:
        space-between;

    align-items:
        center;

    gap: 12px;

    margin-bottom: 10px;
}


.role {

    font-size: 17px;

    font-weight: 600;

    text-transform:
        uppercase;
}


.meta {

    opacity: 0.75;

    font-size: 13px;

    margin-bottom: 10px;
}


.success {

    color:
        var(--vscode-testing-iconPassed);
}


.failure {

    color:
        var(--vscode-testing-iconFailed);
}


.issue {
    margin-bottom: 5px;
}


.reasoning {

    margin-top: 10px;

    line-height: 1.45;
}


.reasoning p {
    margin: 6px 0;
}


.comparison {

    border:
        2px solid
        var(--vscode-focusBorder);

    border-radius: 8px;

    padding: 18px;
}


.code {

    background:
        var(--vscode-textCodeBlock-background);

    padding: 16px;

    border-radius: 6px;

    overflow-x: auto;

    white-space: pre;

    font-family:
        Consolas,
        "Courier New",
        monospace;

    font-size: 13px;

    border:
        1px solid
        var(--vscode-panel-border);
}


.buttons {
    margin-top: 12px;
}


button {

    background:
        var(--vscode-button-background);

    color:
        var(--vscode-button-foreground);

    border: none;

    padding: 8px 14px;

    margin-right: 8px;

    border-radius: 4px;

    cursor: pointer;
}


button:hover {

    background:
        var(--vscode-button-hoverBackground);
}


button:disabled {

    opacity: 0.5;

    cursor: default;
}


.evidence {

    border:
        1px solid
        var(--vscode-panel-border);

    border-radius: 6px;

    padding: 12px;

    margin-bottom: 10px;
}


.evidence-title {
    margin-bottom: 6px;
}


.evidence a {

    color:
        var(--vscode-textLink-foreground);

    font-weight: 600;

    cursor: pointer;

    text-decoration: none;
}


.evidence a:hover {

    text-decoration: underline;
}


.evidence p {

    margin:
        4px 0 0 0;

    line-height: 1.4;
}

</style>

</head>


<body>

<h1>
    AshenAudit Review
</h1>


<section class="section">

<h2>
    Specialized Reviewers
</h2>

${reviewerSections}

</section>


<section class="section comparison">

<h2>
    Combined Result
</h2>


<p>

<strong>
    Status:
</strong>

${escapeHtml(
    comparison.status
)}

</p>


<p>

<strong>
    Verdict:
</strong>

${escapeHtml(
    comparison.verdict
)}

</p>


<p>

<strong>
    Confidence:
</strong>

${Math.round(
    comparison.confidence * 100
)}%

</p>


<p>

<strong>
    Reviewers Used:
</strong>

${comparison.reviewersUsed}

</p>


<p>

<strong>
    Explanation:
</strong>

${escapeHtml(
    cleanText(
        comparison.explanation
    )
)}

</p>


<h3>
    Combined Issues
</h3>


<ul>

${issues}

</ul>


</section>


${evidenceSection}


${correctedCodeSection}


<script nonce="${nonce}">

const vscode =
    acquireVsCodeApi();


const correctedCode =
    ${safeCorrectedCode};


/*
 * Copy Code
 */

const copyButton =
    document.getElementById(
        'copyButton'
    );


if (
    copyButton
) {

    copyButton.addEventListener(
        'click',
        () => {

            if (
                !correctedCode
            ) {
                return;
            }


            vscode.postMessage({

                command:
                    'copyCode',

                code:
                    correctedCode

            });

        }
    );
}


/*
 * Apply Fix
 */

const applyButton =
    document.getElementById(
        'applyButton'
    );


if (
    applyButton
) {

    applyButton.addEventListener(
        'click',
        () => {

            if (
                !correctedCode
            ) {
                return;
            }


            vscode.postMessage({

                command:
                    'applyFix',

                code:
                    correctedCode

            });

        }
    );
}


/*
 * External evidence
 */

const externalLinks =
    document.querySelectorAll(
        '.external-link'
    );


externalLinks.forEach(
    link => {

        link.addEventListener(
            'click',
            event => {

                event.preventDefault();


                const target =
                    event.currentTarget;


                if (
                    !(target instanceof
                    HTMLElement)
                ) {
                    return;
                }


                const url =
                    target.dataset.url;


                if (!url) {
                    return;
                }


                vscode.postMessage({

                    command:
                        'openExternal',

                    url

                });

            }
        );
    }
);


/*
 * Fix applied.
 */

window.addEventListener(
    'message',
    event => {

        if (
            event.data &&
            event.data.command ===
            'fixApplied'
        ) {

            const button =
                document.getElementById(
                    'applyButton'
                );


            if (
                button
            ) {

                button.disabled =
                    true;

                button.textContent =
                    'Fix Applied';
            }
        }
    }
);

</script>

</body>

</html>
`;
}


function renderReviewer(
    reviewer: ReviewerDisplay
): string {

    if (
        reviewer.status ===
        'failed'
    ) {

        return `

            <div class="reviewer">

                <div class="header">

                    <div class="role">

                        ${escapeHtml(
                            cleanText(
                                reviewer.role ||
                                reviewer.name ||
                                'Reviewer'
                            )
                        )}

                    </div>


                    <div class="failure">

                        FAILED

                    </div>

                </div>


                <div class="reasoning">

                    ${escapeHtml(
                        cleanText(
                            reviewer.error ||
                            'Unknown error.'
                        )
                    )}

                </div>

            </div>

        `;
    }


    const review =
        reviewer.review;


    if (
        !review
    ) {

        return `

            <div class="reviewer">

                <div class="reasoning">

                    No review data available.

                </div>

            </div>

        `;
    }


    const reviewIssues =
        Array.isArray(
            review.issues
        )
            ? review.issues
            : [];


    const issues =
        reviewIssues.length > 0
            ? reviewIssues
                .map(
                    issue =>
                        `
                        <div class="issue">

                            • ${escapeHtml(
                                cleanText(
                                    String(issue)
                                )
                            )}

                        </div>
                        `
                )
                .join('')
            : `
                <div>
                    No issues found.
                </div>
            `;


    const verdictClass =
        review.verdict ===
        'pass'
            ? 'success'
            : review.verdict ===
              'issues_found'
                ? 'failure'
                : '';


    return `

        <div class="reviewer">

            <div class="header">

                <div class="role">

                    ${escapeHtml(
                        cleanText(
                            review.role
                        )
                    )}

                </div>


                <div class="${verdictClass}">

                    ${escapeHtml(
                        cleanText(
                            review.verdict
                        )
                    )}

                </div>

            </div>


            <div class="meta">

                Provider:
                ${escapeHtml(
                    cleanText(
                        review.provider
                    )
                )}

                &nbsp; | &nbsp;

                Model:
                ${escapeHtml(
                    cleanText(
                        review.model
                    )
                )}

            </div>


            <div>

                <strong>
                    Confidence:
                </strong>

                ${formatConfidence(
                    review.confidence
                )}

            </div>


            <div class="section">

                <strong>
                    Issues
                </strong>

                <div>

                    ${issues}

                </div>

            </div>


            <div class="reasoning">

                <strong>
                    Reasoning
                </strong>

                <p>
                    ${escapeHtml(
                        cleanText(
                            review.reasoning
                        )
                    )}
                </p>

            </div>

        </div>

    `;
}


function formatConfidence(
    confidence: number
): string {

    if (
        typeof confidence !==
        'number' ||
        !Number.isFinite(
            confidence
        )
    ) {

        return 'N/A';
    }


    const safeConfidence =
        Math.max(
            0,
            Math.min(
                1,
                confidence
            )
        );


    return `${
        Math.round(
            safeConfidence * 100
        )
    }%`;
}


function cleanText(
    value: string
): string {

    return String(value)
        .replace(
            /\s+/g,
            ' '
        )
        .trim();
}


function escapeHtml(
    value: string
): string {

    return String(value)
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


function escapeAttribute(
    value: string
): string {

    return escapeHtml(
        value
    );
}


function getNonce(): string {

    const characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';


    let nonce =
        '';


    for (
        let index = 0;
        index < 32;
        index++
    ) {

        nonce +=
            characters.charAt(
                Math.floor(
                    Math.random() *
                    characters.length
                )
            );
    }


    return nonce;
}