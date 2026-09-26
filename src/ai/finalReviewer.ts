import {
    reviewWithGemini
} from './gemini.js';

import {
    reviewWithGroq
} from './groq.js';

import {
    ReviewResult,
    SpecializedReviewResult
} from './types.js';


export interface ExternalEvidence {

    title: string;

    link: string;

    snippet: string;
}


export async function generateFinalReview(
    code: string,
    reviews: SpecializedReviewResult[],
    externalEvidence: ExternalEvidence[],
    validationFeedback: string = ''
): Promise<ReviewResult> {

    const reviewerFindings =
        reviews
            .map(
                review => {

                    const issues =
                        review.issues.length > 0
                            ? review.issues
                                .map(
                                    issue =>
                                        `- ${String(issue).trim()}`
                                )
                                .join('\n')
                            : 'None';


                    return [
                        `Reviewer role: ${review.role}`,
                        `Provider: ${review.provider}`,
                        `Model: ${review.model}`,
                        `Verdict: ${review.verdict}`,
                        `Confidence: ${review.confidence}`,
                        '',
                        'Issues:',
                        issues,
                        '',
                        `Reasoning: ${cleanText(review.reasoning)}`
                    ].join('\n');
                }
            )
            .join(
                '\n-------------------------\n'
            );


    const evidence =
        externalEvidence.length > 0
            ? externalEvidence
                .map(
                    result =>
                        [
                            `Title: ${cleanText(result.title)}`,
                            `Link: ${result.link}`,
                            `Snippet: ${cleanText(result.snippet)}`
                        ].join('\n')
                )
                .join(
                    '\n-------------------------\n'
                )
            : 'No external evidence was available.';


    const validation =
        validationFeedback.trim()
            ? validationFeedback.trim()
            : 'No local validation has been performed yet.';


    const instruction = `
You are the final repair and verification stage of AshenAudit.

Your task is to inspect the ORIGINAL source code and produce the most accurate final result.

You have:

1. Findings from specialized reviewers.
2. Optional external technical evidence.
3. Optional compiler or linter validation output.

IMPORTANT RULES:

- Inspect the original source code yourself.
- Do not blindly trust reviewers.
- Do not blindly trust external evidence.
- Treat compiler errors as strong evidence.
- Only fix problems that are actually present.
- Preserve the original intended functionality.
- Do not make unnecessary stylistic changes.
- Fix all genuine syntax, logic, structural, and relevant resource-management problems.
- The correctedCode must contain the COMPLETE corrected source code.
- Never return only changed lines.
- Never use Markdown code fences inside correctedCode.
- Do not place explanations inside correctedCode.
- If real problems exist, verdict must be "issues_found".
- If the code is correct, correctedCode must be "".
- Keep reasoning short and direct.
- Return ONLY valid JSON.

Required JSON format:

{
    "verdict": "issues_found",
    "confidence": 0.99,
    "issues": [
        "Description of issue 1"
    ],
    "reasoning": "Short explanation.",
    "correctedCode": "COMPLETE corrected source code"
}

SPECIALIZED REVIEWER FINDINGS:

${reviewerFindings}

EXTERNAL TECHNICAL EVIDENCE:

${evidence}

LOCAL VALIDATION:

${validation}
`;


    console.log(
        'AshenAudit: Running final repair reviewer...'
    );


    /*
     * Primary final reviewer: Gemini.
     */

    try {

        const review =
            await reviewWithGemini(
                code,
                instruction,
                'gemini-3.6-flash'
            );


        console.log(
            'AshenAudit: Final review completed with Gemini.'
        );


        return review;

    } catch (geminiError) {

        const geminiMessage =
            geminiError instanceof Error
                ? geminiError.message
                : String(
                    geminiError
                );


        console.error(
            'AshenAudit: Gemini final reviewer failed:',
            geminiMessage
        );


        /*
         * Fallback final reviewer: Groq.
         */

        try {

            const review =
                await reviewWithGroq(
                    code,
                    instruction,
                    'openai/gpt-oss-20b'
                );


            console.log(
                'AshenAudit: Final review completed with Groq fallback.'
            );


            return review;

        } catch (groqError) {

            const groqMessage =
                groqError instanceof Error
                    ? groqError.message
                    : String(
                        groqError
                    );


            throw new Error(
                [
                    'All final reviewers failed.',
                    `Gemini: ${geminiMessage}`,
                    `Groq: ${groqMessage}`
                ].join('\n')
            );
        }
    }
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