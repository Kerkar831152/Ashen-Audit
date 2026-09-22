import * as vscode from 'vscode';
import * as path from 'path';
import * as dotenv from 'dotenv';

import {
    reviewCode,
    reviewCodeWithGeminiLite
} from './ai/gemini.js';

import {
    ReviewResult
} from './ai/types.js';

import {
    reviewCodeWithOpenAI
} from './ai/openai.js';

import {
    reviewCodeWithGroq
} from './ai/groq.js';

import {
    compareReviews
} from './ai/compare.js';

import {
    showReviewPanel,
    ReviewerDisplay
} from './ui/reviewPanel.js';


export function activate(
    context: vscode.ExtensionContext
) {

    /*
     * Load .env from the actual extension
     * installation/project directory.
     */

    const envPath =
        path.join(
            context.extensionPath,
            '.env'
        );

    const envResult =
        dotenv.config({
            path: envPath
        });


    console.log(
        'AshenAudit: Extension activated.'
    );

    console.log(
        'AshenAudit: .env path:',
        envPath
    );

    console.log(
        'AshenAudit: .env loaded:',
        envResult.error
            ? 'NO'
            : 'YES'
    );

    console.log(
        'GROQ KEY:',
        process.env.GROQ_API_KEY
            ? 'LOADED'
            : 'MISSING'
    );


    const output =
        vscode.window.createOutputChannel(
            'AshenAudit'
        );


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


                const selection =
                    editor.selection;


                const code =
                    editor.document.getText(
                        selection
                    );


                if (!code.trim()) {

                    vscode.window.showWarningMessage(
                        'AshenAudit: Please select some code first.'
                    );

                    return;
                }


                const documentUri =
                    editor.document.uri;


                const selectionRange =
                    new vscode.Range(
                        selection.start,
                        selection.end
                    );


                output.clear();


                output.appendLine(
                    'AshenAudit'
                );

                output.appendLine(
                    '=========='
                );

                output.appendLine('');


                output.appendLine(
                    'Code received.'
                );

                output.appendLine('');


                output.appendLine(
                    'Starting independent AI reviewers...'
                );

                output.appendLine('');


                output.show();


                let reviewers:
                    ReviewerDisplay[] = [];


                let comparison:
                    ReturnType<
                        typeof compareReviews
                    >;


                try {

                    comparison =
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
                                        reviewCodeWithGroq(code),
                                        reviewCodeWithOpenAI(code)
                                    ]);


                                const names = [

                                    'Gemini 3.6 Flash',

                                    'Gemini 3.1 Flash-Lite',

                                    'Groq GPT-OSS 20B',

                                    'OpenAI GPT-5.6 Luna'

                                ];


                                for (
                                    let i = 0;
                                    i < results.length;
                                    i++
                                ) {

                                    const result =
                                        results[i];


                                    if (
                                        result.status ===
                                        'fulfilled'
                                    ) {

                                        reviewers.push({

                                            name:
                                                names[i],

                                            status:
                                                'success',

                                            review:
                                                result.value

                                        });

                                    } else {

                                        reviewers.push({

                                            name:
                                                names[i],

                                            status:
                                                'failed',

                                            error:
                                                result.reason instanceof Error
                                                    ? result.reason.message
                                                    : String(
                                                        result.reason
                                                    )

                                        });

                                    }

                                }


                                output.appendLine(
                                    'INDIVIDUAL REVIEWS'
                                );

                                output.appendLine(
                                    '=================='
                                );

                                output.appendLine('');


                                for (
                                    const reviewer
                                    of reviewers
                                ) {

                                    output.appendLine(
                                        reviewer.name
                                    );


                                    output.appendLine(
                                        '-'.repeat(
                                            reviewer.name.length
                                        )
                                    );


                                    if (
                                        reviewer.status ===
                                        'failed'
                                    ) {

                                        output.appendLine(
                                            'Status: FAILED'
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
                                        review.issues.length ===
                                        0
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


                                    output.appendLine('');

                                }


                                const successfulReviews:
                                    ReviewResult[] =
                                        reviewers
                                            .filter(
                                                reviewer =>
                                                    reviewer.status ===
                                                    'success'
                                            )
                                            .map(
                                                reviewer =>
                                                    reviewer.review!
                                            );


                                const result =
                                    compareReviews(
                                        successfulReviews
                                    );


                                output.appendLine('');
                                output.appendLine(
                                    'ASHENAUDIT COMPARISON'
                                );

                                output.appendLine(
                                    '====================='
                                );

                                output.appendLine('');


                                output.appendLine(
                                    `Status: ${result.status}`
                                );


                                output.appendLine(
                                    `Final Verdict: ${result.verdict}`
                                );


                                output.appendLine(
                                    `Confidence: ${result.confidence.toFixed(2)}`
                                );


                                output.appendLine(
                                    `Reviewers Used: ${result.reviewersUsed}`
                                );


                                output.appendLine('');


                                output.appendLine(
                                    'Explanation:'
                                );


                                output.appendLine(
                                    result.explanation
                                );


                                output.appendLine('');


                                output.appendLine(
                                    'Combined Issues:'
                                );


                                if (
                                    result.issues.length ===
                                    0
                                ) {

                                    output.appendLine(
                                        '- No issues found.'
                                    );

                                } else {

                                    for (
                                        const issue
                                        of result.issues
                                    ) {

                                        output.appendLine(
                                            `- ${issue}`
                                        );

                                    }

                                }


                                if (
                                    result.correctedCode
                                ) {

                                    output.appendLine('');

                                    output.appendLine(
                                        'Suggested Corrected Code:'
                                    );

                                    output.appendLine(
                                        result.correctedCode
                                    );

                                }


                                output.appendLine('');
                                output.appendLine(
                                    'Next step:'
                                );


                                if (
                                    result.status ===
                                    'agreement'
                                ) {

                                    output.appendLine(
                                        'AI reviewers agree. External evidence is not currently required.'
                                    );

                                } else if (
                                    result.status ===
                                    'disagreement'
                                ) {

                                    output.appendLine(
                                        'AI reviewers disagree. This case should be sent to SerpApi for external evidence.'
                                    );

                                } else {

                                    output.appendLine(
                                        'Not enough reviewers responded for independent verification.'
                                    );

                                }


                                return result;

                            }
                        );


                    showReviewPanel(
                        context,
                        reviewers,
                        comparison,
                        documentUri,
                        selectionRange
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

                    output.appendLine(
                        message
                    );


                    output.show();


                    vscode.window.showErrorMessage(
                        `AshenAudit: ${message}`
                    );

                }

            }
        );


    context.subscriptions.push(
        verifyCode
    );


    context.subscriptions.push(
        output
    );

}


export function deactivate() {}
