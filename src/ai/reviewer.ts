import {
    ReviewerRole,
    ReviewResult,
    SpecializedReviewResult
} from './types.js';

import {
    reviewWithGemini
} from './gemini.js';

import {
    reviewWithGroq
} from './groq.js';

import {
    reviewWithOpenAI
} from './openai.js';


interface ReviewerConfig {
    provider: 'gemini' | 'groq' | 'openai';
    model: string;
}


const roleInstructions: Record<ReviewerRole, string> = {

    triage: `
You are the triage reviewer.

Focus on identifying obvious and immediate problems in the supplied code.

Check for:
- Syntax errors
- Obvious type errors
- Malformed code
- Invalid API usage
- Missing required pieces
- Code that clearly cannot run as written

Do not focus on deeper architecture or security issues unless they
directly prevent the code from working.
`,

    architecture: `
You are the architecture reviewer.

Focus on the overall structure and design of the supplied code.

Check for:
- Incorrect imports or module boundaries
- Poor separation of responsibilities
- Incorrect framework or library usage
- Problems with API integration
- State management problems
- Dependency problems
- Structural issues that could cause maintenance or runtime problems

Do not report minor style preferences as bugs.
`,

    logic: `
You are the logic reviewer.

Focus on whether the supplied code behaves correctly.

Check for:
- Incorrect control flow
- Incorrect data flow
- Algorithmic mistakes
- Incorrect assumptions
- Edge cases
- Loops and conditions
- State transitions
- Race conditions
- Runtime logic failures
- Resource handling

Trace the code carefully before reporting an issue.
`,

    security: `
You are the security reviewer.

Focus only on genuine security risks in the supplied code.

Check for:
- SQL injection
- XSS
- Command injection
- Path traversal
- Authentication problems
- Authorization problems
- Exposed secrets
- Unsafe deserialization
- Unsafe handling of user input
- Weak cryptographic practices
- Sensitive information leakage

Do not invent vulnerabilities. Only report a vulnerability when
the supplied code provides evidence for it.
`
};


const reviewerFallbacks: Record<
    ReviewerRole,
    ReviewerConfig[]
> = {

    triage: [
        {
            provider: 'gemini',
            model: 'gemini-3.1-flash-lite'
        },
        {
            provider: 'gemini',
            model: 'gemini-3.6-flash'
        },
        {
            provider: 'groq',
            model: 'openai/gpt-oss-20b'
        }
    ],

    architecture: [
        {
            provider: 'gemini',
            model: 'gemini-3.6-flash'
        },
        {
            provider: 'groq',
            model: 'openai/gpt-oss-20b'
        },
        {
            provider: 'gemini',
            model: 'gemini-3.1-flash-lite'
        }
    ],

    logic: [
        {
            provider: 'groq',
            model: 'openai/gpt-oss-20b'
        },
        {
            provider: 'gemini',
            model: 'gemini-3.6-flash'
        },
        {
            provider: 'gemini',
            model: 'gemini-3.1-flash-lite'
        }
    ],

    security: [
        {
            provider: 'openai',
            model: 'gpt-5.6-luna'
        },
        {
            provider: 'groq',
            model: 'openai/gpt-oss-20b'
        },
        {
            provider: 'gemini',
            model: 'gemini-3.6-flash'
        }
    ]
};


export async function runSpecializedReviewer(
    role: ReviewerRole,
    code: string
): Promise<SpecializedReviewResult> {

    const instruction =
        roleInstructions[role];

    const configurations =
        reviewerFallbacks[role];

    const errors: string[] = [];


    for (const config of configurations) {

        try {

            let review: ReviewResult;


            if (
                config.provider ===
                'gemini'
            ) {

                review =
                    await reviewWithGemini(
                        code,
                        instruction,
                        config.model
                    );

            } else if (
                config.provider ===
                'groq'
            ) {

                review =
                    await reviewWithGroq(
                        code,
                        instruction,
                        config.model
                    );

            } else {

                review =
                    await reviewWithOpenAI(
                        code,
                        instruction,
                        config.model
                    );
            }


            return {
                ...review,
                role,
                provider:
                    config.provider,
                model:
                    config.model
            };


        } catch (error) {

            const message =
                error instanceof Error
                    ? error.message
                    : String(error);


            errors.push(
                `${config.provider}/${config.model}: ${message}`
            );


            console.error(
                `AshenAudit: ${role} reviewer failed:`,
                message
            );
        }
    }


    throw new Error(
        `${role} reviewer failed on all available providers.\n` +
        errors.join('\n')
    );
}


/*
 * Final synthesis stage.
 *
 * This is different from the specialized reviewers.
 *
 * The specialized reviewers identify problems.
 * This reviewer decides what the final corrected code should be.
 */

export async function generateFinalReview(
    code: string,
    reviews: SpecializedReviewResult[],
    externalEvidence: {
        title: string;
        link: string;
        snippet: string;
    }[]
): Promise<ReviewResult> {

    const reviewerFindings =
        reviews
            .map(review => {

                const issues =
                    review.issues.length > 0
                        ? review.issues
                            .map(
                                issue =>
                                    `- ${issue}`
                            )
                            .join('\n')
                        : '- No issues found.';

                return `
ROLE: ${review.role}
PROVIDER: ${review.provider}
MODEL: ${review.model}
VERDICT: ${review.verdict}
CONFIDENCE: ${review.confidence}

ISSUES:
${issues}

REASONING:
${review.reasoning}
`;
            })
            .join('\n--------------------\n');


    const evidence =
        externalEvidence.length > 0
            ? externalEvidence
                .map(
                    result =>
                        `
TITLE: ${result.title}
URL: ${result.link}
EVIDENCE: ${result.snippet}
`
                )
                .join('\n')
            : 'No external technical evidence was available.';


    const instruction = `
You are the FINAL synthesis reviewer for AshenAudit.

Your job is to determine the final result of the code verification.

The original code is supplied below.

Multiple specialized reviewers have already analyzed the code.

Their findings are supplied below.

External technical evidence from SerpApi is also supplied below.

IMPORTANT:

1. Carefully inspect the ORIGINAL CODE yourself.
2. Use reviewer findings as evidence, not unquestionable truth.
3. Do not invent problems.
4. Ignore reviewer claims that are unsupported by the code.
5. Resolve disagreements when the code provides enough evidence.
6. External evidence should only support the conclusion.
7. Do not blindly trust search results.
8. Preserve the original intended behavior of the program.
9. Do not make unnecessary stylistic changes.
10. If the code contains real problems, produce the COMPLETE corrected code.
11. correctedCode must contain the ENTIRE corrected source file, not only the changed lines.
12. If the original code is correct, correctedCode must be an empty string.
13. If there are real issues, verdict must be "issues_found".
14. If the evidence is insufficient to confidently determine correctness, verdict may be "uncertain".

The corrected code must compile logically according to the language represented by the original code.

Return ONLY valid JSON.

Required structure:

{
    "verdict": "issues_found",
    "confidence": 0.95,
    "issues": [
        "Issue 1",
        "Issue 2"
    ],
    "reasoning": "Concise explanation of the final decision.",
    "correctedCode": "COMPLETE corrected source code here"
}

OR, if no problem exists:

{
    "verdict": "pass",
    "confidence": 0.95,
    "issues": [],
    "reasoning": "The supplied code is correct.",
    "correctedCode": ""
}

OR, if evidence is insufficient:

{
    "verdict": "uncertain",
    "confidence": 0.50,
    "issues": [],
    "reasoning": "Why the result is uncertain.",
    "correctedCode": ""
}

SPECIALIZED REVIEWER FINDINGS:

${reviewerFindings}

EXTERNAL TECHNICAL EVIDENCE:

${evidence}
`;


    console.log(
        'AshenAudit: Running final synthesis reviewer...'
    );


    return await reviewWithGemini(
        code,
        instruction,
        'gemini-3.6-flash'
    );
}