import * as vscode from 'vscode';
import * as path from 'path';
import * as dotenv from 'dotenv';

import {
    runSpecializedReviewer
} from './ai/reviewer.js';

import {
    generateFinalReview
} from './ai/finalReviewer.js';

import {
    validateCode,
    ValidationResult
} from './ai/validator.js';

import {
    ReviewerDisplay,
    SpecializedReviewResult,
    ReviewerRole
} from './ai/types.js';

import {
    compareReviews,
    ComparisonResult
} from './ai/compare.js';

import {
    searchWithSerpApi,
    SearchResult
} from './ai/serpapi.js';

import {
    showReviewPanel
} from './ui/reviewPanel.js';


export function activate(
    context: vscode.ExtensionContext
) {

    const envPath =
        path.join(
            context.extensionPath,
            '.env'
        );


    const envResult =
        dotenv.config({
            path: envPath
        });


    if (envResult.error) {

        console.error(
            'AshenAudit: Failed to load .env:',
            envResult.error
        );
    }


    const disposable =
        vscode.commands.registerCommand(
            'ashen-audit.verifyCode',
            async () => {

                vscode.window.showInformationMessage(
                    'AshenAudit verification started.'
                );


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


                if (
                    selection.isEmpty
                ) {

                    vscode.window.showWarningMessage(
                        'AshenAudit: Select some code first.'
                    );

                    return;
                }


                const code =
                    editor.document.getText(
                        selection
                    );


                const languageId =
                    editor.document.languageId;


                const outputChannel =
                    vscode.window.createOutputChannel(
                        'AshenAudit'
                    );


                outputChannel.show(
                    true
                );


                outputChannel.appendLine(
                    '========================================'
                );

                outputChannel.appendLine(
                    'AshenAudit verification started'
                );

                outputChannel.appendLine(
                    '========================================'
                );


                const roles:
                    ReviewerRole[] = [
                        'triage',
                        'architecture',
                        'logic',
                        'security'
                    ];


                const results =
                    await Promise.allSettled(
                        roles.map(
                            role =>
                                runSpecializedReviewer(
                                    role,
                                    code
                                )
                        )
                    );


                const reviewers:
                    ReviewerDisplay[] = [];


                const successfulReviews:
                    SpecializedReviewResult[] = [];


                results.forEach(
                    (
                        result,
                        index
                    ) => {

                        const role =
                            roles[index];


                        if (
                            result.status ===
                            'fulfilled'
                        ) {

                            const review =
                                result.value;


                            successfulReviews.push(
                                review
                            );


                            reviewers.push({

                                name:
                                    `${role} reviewer`,

                                role:
                                    review.role,

                                provider:
                                    review.provider,

                                model:
                                    review.model,

                                status:
                                    'success',

                                review

                            });


                            outputChannel.appendLine('');

                            outputChannel.appendLine(
                                `========== ${role.toUpperCase()} ==========`
                            );

                            outputChannel.appendLine(
                                `Provider: ${review.provider}`
                            );

                            outputChannel.appendLine(
                                `Model: ${review.model}`
                            );

                            outputChannel.appendLine(
                                `Verdict: ${review.verdict}`
                            );

                            outputChannel.appendLine(
                                `Confidence: ${review.confidence}`
                            );


                            if (
                                review.issues.length > 0
                            ) {

                                outputChannel.appendLine(
                                    'Issues:'
                                );


                                review.issues.forEach(
                                    issue => {

                                        outputChannel.appendLine(
                                            `- ${issue}`
                                        );
                                    }
                                );

                            } else {

                                outputChannel.appendLine(
                                    'Issues: None'
                                );
                            }


                            outputChannel.appendLine(
                                `Reasoning: ${review.reasoning}`
                            );


                        } else {

                            const error =
                                result.reason instanceof Error
                                    ? result.reason.message
                                    : String(
                                        result.reason
                                    );


                            reviewers.push({

                                name:
                                    `${role} reviewer`,

                                role,

                                status:
                                    'failed',

                                error

                            });


                            outputChannel.appendLine('');

                            outputChannel.appendLine(
                                `========== ${role.toUpperCase()} ==========`
                            );

                            outputChannel.appendLine(
                                `FAILED: ${error}`
                            );
                        }
                    }
                );


                let comparison:
                    ComparisonResult =
                    compareReviews(
                        successfulReviews
                    );


                outputChannel.appendLine('');

                outputChannel.appendLine(
                    '========================================'
                );

                outputChannel.appendLine(
                    'COMBINED RESULT'
                );

                outputChannel.appendLine(
                    '========================================'
                );

                outputChannel.appendLine(
                    `Status: ${comparison.status}`
                );

                outputChannel.appendLine(
                    `Verdict: ${comparison.verdict}`
                );

                outputChannel.appendLine(
                    `Confidence: ${comparison.confidence}`
                );

                outputChannel.appendLine(
                    `Reviewers used: ${comparison.reviewersUsed}`
                );

                outputChannel.appendLine(
                    `Explanation: ${comparison.explanation}`
                );


                /*
                 * Search external evidence only when
                 * primary technical reviewers disagree.
                 */

                let externalEvidence:
                    SearchResult[] = [];


                if (
                    comparison.status ===
                    'disagreement'
                ) {

                    outputChannel.appendLine('');

                    outputChannel.appendLine(
                        'Reviewers disagreed.'
                    );

                    outputChannel.appendLine(
                        'Searching external technical evidence...'
                    );


                    try {

                        const searchQuery =
                            buildTechnicalSearchQuery(
                                languageId,
                                comparison.issues
                            );


                        outputChannel.appendLine(
                            `Search query: ${searchQuery}`
                        );


                        const searchResult =
                            await searchWithSerpApi(
                                searchQuery
                            );


                        externalEvidence =
                            searchResult.results;


                        outputChannel.appendLine(
                            `SerpApi results: ${externalEvidence.length}`
                        );


                        externalEvidence.forEach(
                            (
                                result,
                                index
                            ) => {

                                outputChannel.appendLine(
                                    `${index + 1}. ${result.title}`
                                );

                                outputChannel.appendLine(
                                    `   ${result.link}`
                                );

                                outputChannel.appendLine(
                                    `   ${result.snippet}`
                                );
                            }
                        );


                    } catch (error) {

                        const message =
                            error instanceof Error
                                ? error.message
                                : String(error);


                        outputChannel.appendLine(
                            `SerpApi failed: ${message}`
                        );
                    }
                }


                /*
                 * FINAL SYNTHESIS
                 */

                outputChannel.appendLine('');

                outputChannel.appendLine(
                    '========================================'
                );

                outputChannel.appendLine(
                    'FINAL SYNTHESIS'
                );

                outputChannel.appendLine(
                    '========================================'
                );


                if (
                    successfulReviews.length === 0
                ) {

                    outputChannel.appendLine(
                        'Final synthesis skipped: no successful reviewers.'
                    );

                } else {

                    try {

                        const finalReview =
                            await generateFinalReview(
                                code,
                                successfulReviews,
                                externalEvidence
                            );


                        comparison =
                            applyFinalReview(
                                comparison,
                                finalReview
                            );


                        outputChannel.appendLine(
                            `Final verdict: ${finalReview.verdict}`
                        );

                        outputChannel.appendLine(
                            `Final confidence: ${finalReview.confidence}`
                        );

                        outputChannel.appendLine(
                            `Final issues: ${finalReview.issues.length}`
                        );


                        outputChannel.appendLine(
                            finalReview.correctedCode &&
                            finalReview.correctedCode.trim()
                                ? 'Final corrected code: GENERATED'
                                : 'Final corrected code: NONE'
                        );


                    } catch (error) {

                        const message =
                            error instanceof Error
                                ? error.message
                                : String(error);


                        outputChannel.appendLine(
                            `Final synthesis failed: ${message}`
                        );


                        /*
                         * Keep a correction from a specialized reviewer
                         * instead of losing it completely.
                         */

                        const reviewerCorrection =
                            successfulReviews.find(
                                review =>
                                    review.correctedCode &&
                                    review.correctedCode.trim()
                            );


                        if (
                            reviewerCorrection
                        ) {

                            comparison.correctedCode =
                                reviewerCorrection.correctedCode;

                            comparison.verdict =
                                'issues_found';

                            comparison.explanation =
                                `Final synthesis unavailable. Using the correction generated by the ${reviewerCorrection.role} reviewer.`;

                            outputChannel.appendLine(
                                `Fallback corrected code: ${reviewerCorrection.role} reviewer`
                            );
                        }
                    }
                }


                /*
                 * LOCAL VALIDATION
                 */

                outputChannel.appendLine('');

                outputChannel.appendLine(
                    '========================================'
                );

                outputChannel.appendLine(
                    'LOCAL VALIDATION'
                );

                outputChannel.appendLine(
                    '========================================'
                );


                let validation:
                    ValidationResult | null =
                    null;


                const codeToValidate =
                    comparison.correctedCode &&
                    comparison.correctedCode.trim()
                        ? comparison.correctedCode
                        : code;


                try {

                    validation =
                        await validateCode(
                            codeToValidate,
                            languageId
                        );


                    outputChannel.appendLine(
                        `Validator: ${validation.compiler}`
                    );

                    outputChannel.appendLine(
                        `Status: ${validation.status}`
                    );

                    outputChannel.appendLine(
                        validation.output
                    );


                    /*
                     * If generated code fails compilation,
                     * send compiler output back into final repair.
                     */

                    if (
                        validation.status ===
                        'failed' &&
                        comparison.correctedCode &&
                        comparison.correctedCode.trim()
                    ) {

                        outputChannel.appendLine('');

                        outputChannel.appendLine(
                            'Generated code failed local validation.'
                        );

                        outputChannel.appendLine(
                            'Running final repair again with compiler errors...'
                        );


                        try {

                            const retryReview =
                                await generateFinalReview(
                                    code,
                                    successfulReviews,
                                    externalEvidence,
                                    validation.output
                                );


                            comparison =
                                applyFinalReview(
                                    comparison,
                                    retryReview
                                );


                            outputChannel.appendLine(
                                `Retry verdict: ${retryReview.verdict}`
                            );

                            outputChannel.appendLine(
                                `Retry confidence: ${retryReview.confidence}`
                            );


                            if (
                                retryReview.correctedCode &&
                                retryReview.correctedCode.trim()
                            ) {

                                outputChannel.appendLine(
                                    'Retry corrected code: GENERATED'
                                );


                                validation =
                                    await validateCode(
                                        retryReview.correctedCode,
                                        languageId
                                    );


                                outputChannel.appendLine('');

                                outputChannel.appendLine(
                                    'Second validation attempt:'
                                );

                                outputChannel.appendLine(
                                    `Validator: ${validation.compiler}`
                                );

                                outputChannel.appendLine(
                                    `Status: ${validation.status}`
                                );

                                outputChannel.appendLine(
                                    validation.output
                                );
                            }


                        } catch (error) {

                            const message =
                                error instanceof Error
                                    ? error.message
                                    : String(error);


                            outputChannel.appendLine(
                                `Retry repair failed: ${message}`
                            );
                        }
                    }


                    /*
                     * Add compact validation information
                     * to the explanation shown in the UI.
                     */

                    const validationText =
                        buildValidationText(
                            validation
                        );


                    comparison.explanation =
                        `${comparison.explanation.trim()} ${validationText}`;


                    if (
                        validation.status ===
                        'failed'
                    ) {

                        comparison.verdict =
                            'issues_found';
                    }


                } catch (error) {

                    const message =
                        error instanceof Error
                            ? error.message
                            : String(error);


                    outputChannel.appendLine(
                        `Local validation could not run: ${message}`
                    );


                    comparison.explanation =
                        `${comparison.explanation.trim()} Local validation could not be completed.`;
                }


                /*
                 * FINAL RESULT
                 */

                outputChannel.appendLine('');

                outputChannel.appendLine(
                    '========================================'
                );

                outputChannel.appendLine(
                    'FINAL RESULT'
                );

                outputChannel.appendLine(
                    '========================================'
                );

                outputChannel.appendLine(
                    `Verdict: ${comparison.verdict}`
                );

                outputChannel.appendLine(
                    `Confidence: ${comparison.confidence}`
                );

                outputChannel.appendLine(
                    `Corrected code: ${
                        comparison.correctedCode &&
                        comparison.correctedCode.trim()
                            ? 'YES'
                            : 'NO'
                    }`
                );


                if (
                    validation
                ) {

                    outputChannel.appendLine(
                        `Local validation: ${validation.status}`
                    );
                }


                /*
                 * Open review window.
                 */

                showReviewPanel(
                    context,
                    reviewers,
                    comparison,
                    editor.document.uri,
                    selection,
                    externalEvidence
                );
            }
        );


    context.subscriptions.push(
        disposable
    );
}


function applyFinalReview(
    comparison: ComparisonResult,
    finalReview: {
        verdict:
            'pass' |
            'issues_found' |
            'uncertain';

        confidence:
            number;

        issues:
            string[];

        reasoning:
            string;

        correctedCode:
            string;
    }
): ComparisonResult {

    comparison.verdict =
        finalReview.verdict;

    comparison.confidence =
        finalReview.confidence;

    comparison.explanation =
        finalReview.reasoning.trim();

    comparison.issues =
        finalReview.issues;

    comparison.correctedCode =
        finalReview.correctedCode;


    return comparison;
}


function buildValidationText(
    validation: ValidationResult
): string {

    if (
        validation.status ===
        'passed'
    ) {

        return (
            `Local validation passed using ${validation.compiler}.`
        );
    }


    if (
        validation.status ===
        'failed'
    ) {

        return (
            `Local validation failed using ${validation.compiler}. ${validation.output.trim()}`
        );
    }


    return (
        `Local validation unavailable: ${validation.output.trim()}`
    );
}


function buildTechnicalSearchQuery(
    languageId: string,
    issues: string[]
): string {

    const languageMap:
        Record<string, string> = {

        cpp:
            'C++',

        c:
            'C',

        javascript:
            'JavaScript',

        typescript:
            'TypeScript',

        python:
            'Python',

        java:
            'Java',

        csharp:
            'C#',

        go:
            'Go',

        rust:
            'Rust'
    };


    const language =
        languageMap[languageId] ||
        languageId;


    const cleanedIssues =
        issues
            .map(
                issue =>
                    issue
                        .replace(
                            /^\[[^\]]+\]\s*/,
                            ''
                        )
                        .replace(
                            /[`'"()[\]]/g,
                            ' '
                        )
                        .replace(
                            /\s+/g,
                            ' '
                        )
                        .trim()
            )
            .filter(
                issue =>
                    issue.length > 0
            );


    const selectedIssues =
        cleanedIssues.slice(
            0,
            3
        );


    const keywords =
        selectedIssues
            .join(' ')
            .split(/\s+/)
            .filter(
                word =>
                    word.length > 3
            )
            .slice(
                0,
                18
            )
            .join(' ');


    return (
        `${language} programming ${keywords} syntax documentation`
    );
}


export function deactivate() {}