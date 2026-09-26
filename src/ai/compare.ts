import {
    SpecializedReviewResult
} from './types.js';


export interface ComparisonResult {

    status:
        | 'agreement'
        | 'disagreement'
        | 'insufficient_reviewers';

    verdict:
        | 'pass'
        | 'issues_found'
        | 'uncertain';

    confidence: number;

    reviewersUsed: number;

    explanation: string;

    issues: string[];

    correctedCode: string;
}


export function compareReviews(
    reviews: SpecializedReviewResult[]
): ComparisonResult {

    if (
        reviews.length === 0
    ) {

        return {

            status:
                'insufficient_reviewers',

            verdict:
                'uncertain',

            confidence:
                0,

            reviewersUsed:
                0,

            explanation:
                'No specialized reviewer returned a valid result.',

            issues:
                [],

            correctedCode:
                ''
        };
    }


    /*
     * Security is a separate concern.
     *
     * A security "pass" does not contradict a logic
     * reviewer finding syntax or logic problems.
     */

    const primaryReviews =
        reviews.filter(
            review =>
                review.role !==
                'security'
        );


    if (
        primaryReviews.length === 0
    ) {

        const securityReview =
            reviews[0];


        return {

            status:
                'insufficient_reviewers',

            verdict:
                securityReview.verdict,

            confidence:
                securityReview.confidence,

            reviewersUsed:
                reviews.length,

            explanation:
                'Only the security reviewer returned a result.',

            issues:
                formatIssues(
                    reviews
                ),

            correctedCode:
                getBestCorrectedCode(
                    reviews
                )
        };
    }


    if (
        primaryReviews.length === 1
    ) {

        const review =
            primaryReviews[0];


        return {

            status:
                'insufficient_reviewers',

            verdict:
                review.verdict,

            confidence:
                review.confidence,

            reviewersUsed:
                reviews.length,

            explanation:
                `Only one primary technical reviewer returned a result. Security review was evaluated separately.`,

            issues:
                formatIssues(
                    reviews
                ),

            correctedCode:
                getBestCorrectedCode(
                    reviews
                )
        };
    }


    const verdicts =
        primaryReviews.map(
            review =>
                review.verdict
        );


    const allPrimaryAgree =
        verdicts.every(
            verdict =>
                verdict ===
                verdicts[0]
        );


    if (
        allPrimaryAgree
    ) {

        const verdict =
            verdicts[0];


        const averageConfidence =
            primaryReviews.reduce(
                (
                    total,
                    review
                ) =>
                    total +
                    review.confidence,
                0
            ) /
            primaryReviews.length;


        const securityReview =
            reviews.find(
                review =>
                    review.role ===
                    'security'
            );


        let explanation =
            `All ${primaryReviews.length} primary technical reviewers reached the same verdict: ${verdict}.`;


        if (
            securityReview
        ) {

            explanation +=
                ` Security review: ${securityReview.verdict}.`;
        }


        return {

            status:
                'agreement',

            verdict,

            confidence:
                Math.min(
                    averageConfidence,
                    1
                ),

            reviewersUsed:
                reviews.length,

            explanation,

            issues:
                formatIssues(
                    reviews
                ),

            correctedCode:
                getBestCorrectedCode(
                    reviews
                )
        };
    }


    return {

        status:
            'disagreement',

        verdict:
            'uncertain',

        confidence:
            calculateDisagreementConfidence(
                primaryReviews
            ),

        reviewersUsed:
            reviews.length,

        explanation:
            buildDisagreementExplanation(
                primaryReviews
            ),

        issues:
            formatIssues(
                reviews
            ),

        correctedCode:
            getBestCorrectedCode(
                reviews
            )
    };
}


function formatIssues(
    reviews: SpecializedReviewResult[]
): string[] {

    const issues:
        string[] = [];


    for (
        const review of reviews
    ) {

        for (
            const issue of review.issues
        ) {

            const formattedIssue =
                `[${review.role.toUpperCase()}] ${String(issue).trim()}`;


            if (
                !issues.includes(
                    formattedIssue
                )
            ) {

                issues.push(
                    formattedIssue
                );
            }
        }
    }


    return issues;
}


function getBestCorrectedCode(
    reviews: SpecializedReviewResult[]
): string {

    const correction =
        reviews.find(
            review =>
                typeof review.correctedCode ===
                'string' &&
                review.correctedCode.trim()
        );


    return correction
        ? correction.correctedCode
        : '';
}


function calculateDisagreementConfidence(
    reviews: SpecializedReviewResult[]
): number {

    const average =
        reviews.reduce(
            (
                total,
                review
            ) =>
                total +
                review.confidence,
            0
        ) /
        reviews.length;


    return Math.min(
        average,
        0.5
    );
}


function buildDisagreementExplanation(
    reviews: SpecializedReviewResult[]
): string {

    const results =
        reviews
            .map(
                review =>
                    `${review.role}: ${review.verdict}`
            )
            .join(
                ' | '
            );


    return (
        `Primary technical reviewers disagreed. ` +
        `Results: ${results}. ` +
        `External technical evidence may be used before final repair.`
    );
}