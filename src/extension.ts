import * as vscode from 'vscode';

import {
    reviewCode,
    reviewCodeWithGeminiLite,
    ReviewResult
} from './ai/gemini.js';

import {
    reviewCodeWithOpenAI
} from './ai/openai.js';

interface ReviewerResult {
    name: string;
    status: 'success' | 'failed';
    review?: ReviewResult;
    error?: string;
}

export function activate(context: vscode.ExtensionContext) {

    const output =
        vscode.window.createOutputChannel('AshenAudit');

    const verifyCode =
        vscode.commands.registerCommand(
            'ashen-audit.verifyCode',
            async () => {

                const editor =
                    vscode.window.activeTextEditor;

                if (!editor) {
                    vscode.window.showErrorMessage(
                        'AshenAudit: No active editor found.'
                    );
                    return;
                }

                const selection = editor.selection;

                const code =
                    editor.document.getText(selection);

                if (!code.trim()) {
                    vscode.window.showWarningMessage(
                        'AshenAudit: Please select some code first.'
                    );
                    return;
                }

                output.clear();

                output.appendLine('AshenAudit');
                output.appendLine('==========');
                output.appendLine('');
                output.appendLine('Code received.');
                output.appendLine('');
                output.appendLine(
                    'Starting independent AI reviewers...'
                );
                output.appendLine('');

                output.show();

                try {

                    await vscode.window.withProgress(
                        {
                            location:
                                vscode.ProgressLocation.Notification,
                            title:
                                'AshenAudit: AI reviewers are analyzing your code...',
                            cancellable: false
                        },
                        async () => {

                            const results =
                                await Promise.allSettled([
                                    reviewCode(code),
                                    reviewCodeWithGeminiLite(code),
                                    reviewCodeWithOpenAI(code)
                                ]);

                            const reviewers:
                                ReviewerResult[] = [];

                            const names = [
                                'Gemini 3.6 Flash',
                                'Gemini 3.1 Flash-Lite',
                                'OpenAI GPT-5.6 Luna'
                            ];

                            for (
                                let i = 0;
                                i < results.length;
                                i++
                            ) {

                                const result = results[i];

                                if (result.status === 'fulfilled') {

                                    reviewers.push({
                                        name: names[i],
                                        status: 'success',
                                        review: result.value
                                    });

                                } else {

                                    reviewers.push({
                                        name: names[i],
                                        status: 'failed',
                                        error:
                                            result.reason instanceof Error
                                                ? result.reason.message
                                                : String(result.reason)
                                    });
                                }
                            }

                            output.appendLine(
                                'Reviewer Results'
                            );
                            output.appendLine(
                                '================'
                            );
                            output.appendLine('');

                            for (const reviewer of reviewers) {

                                output.appendLine(
                                    reviewer.name
                                );

                                output.appendLine(
                                    '-'.repeat(
                                        reviewer.name.length
                                    )
                                );

                                if (
                                    reviewer.status === 'failed'
                                ) {

                                    output.appendLine(
                                        `Status: FAILED`
                                    );

                                    output.appendLine(
                                        `Error: ${reviewer.error}`
                                    );

                                    output.appendLine('');

                                    continue;
                                }

                                const review =
                                    reviewer.review!;

                                output.appendLine(
                                    'Status: SUCCESS'
                                );

                                output.appendLine(
                                    `Verdict: ${review.verdict}`
                                );

                                output.appendLine(
                                    `Confidence: ${review.confidence}`
                                );

                                output.appendLine('');

                                output.appendLine(
                                    'Issues:'
                                );

                                if (
                                    review.issues.length === 0
                                ) {

                                    output.appendLine(
                                        '- No issues found.'
                                    );

                                } else {

                                    for (
                                        const issue
                                        of review.issues
                                    ) {

                                        output.appendLine(
                                            `- ${issue}`
                                        );
                                    }
                                }

                                output.appendLine('');

                                output.appendLine(
                                    'Reasoning:'
                                );

                                output.appendLine(
                                    review.reasoning
                                );

                                if (
                                    review.correctedCode
                                ) {

                                    output.appendLine('');

                                    output.appendLine(
                                        'Corrected Code:'
                                    );

                                    output.appendLine(
                                        review.correctedCode
                                    );
                                }

                                output.appendLine('');
                            }

                            const successfulReviewers =
                                reviewers.filter(
                                    reviewer =>
                                        reviewer.status ===
                                        'success'
                                );

                            output.appendLine(
                                'Summary'
                            );

                            output.appendLine(
                                '======='
                            );

                            output.appendLine(
                                `Successful reviewers: ${successfulReviewers.length}/3`
                            );

                            if (
                                successfulReviewers.length === 0
                            ) {

                                output.appendLine(
                                    'No AI reviewer returned a result.'
                                );

                            } else {

                                output.appendLine(
                                    'The verification process continued despite any failed reviewer.'
                                );
                            }

                            output.show();
                        }
                    );

                } catch (error) {

                    console.error(
                        'AshenAudit: Verification failed:',
                        error
                    );

                    const message =
                        error instanceof Error
                            ? error.message
                            : String(error);

                    output.appendLine('');
                    output.appendLine(
                        'AshenAudit process failed:'
                    );
                    output.appendLine(message);

                    output.show();

                    vscode.window.showErrorMessage(
                        `AshenAudit: ${message}`
                    );
                }
            }
        );

    context.subscriptions.push(verifyCode);
    context.subscriptions.push(output);
}

export function deactivate() {}